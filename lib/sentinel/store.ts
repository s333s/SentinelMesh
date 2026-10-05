import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { analyzeLocally } from './analyzer'
import { planLocally } from './atlas'
import { INITIAL_DEVICES, TOOLS } from './catalog'
import { decide } from './gateway'
import { simulatorAdapter } from './iot'
import { analyzeWithLLM, LLM_MODEL, mergeAnalysis, planWithLLM } from './llm'
import { DEFAULT_POLICIES } from './policies'
import { ALL_SCENARIOS } from './scenarios'
import type {
  ContentAnalysis,
  DashboardState,
  DeviceState,
  InboundMessage,
  PolicyRule,
  ProposedToolCall,
  RequestContext,
  RunResult,
  SecurityEvent,
  SenderTrust,
  Source,
  Stats,
  ToolCall,
} from './types'

interface Store {
  devices: DeviceState
  events: SecurityEvent[]
  policies: PolicyRule[]
  nextId: number
  aiAvailable: boolean
}

const globalForStore = globalThis as unknown as { __sentinelmesh?: Store }

function createStore(): Store {
  const store: Store = {
    devices: { ...INITIAL_DEVICES },
    events: [],
    policies: DEFAULT_POLICIES.map((p) => ({ ...p })),
    nextId: 812,
    aiAvailable: true,
  }
  seedBaseline(store)
  return store
}

export function getStore() {
  globalForStore.__sentinelmesh ??= createStore()
  return globalForStore.__sentinelmesh
}

export function resetStore() {
  globalForStore.__sentinelmesh = createStore()
  return globalForStore.__sentinelmesh
}

const digest = (m: InboundMessage) =>
  createHash('sha256').update(`${m.from}\n${m.subject ?? ''}\n${m.body}`).digest('hex').slice(0, 16)

function behaviorScore(store: Store, sender: string, batchIndex: number, now: number) {
  const recent = store.events.filter(
    (e) => !e.seeded && e.sender === sender && now - Date.parse(e.timestamp) < 120_000,
  )
  const priorBlocked = recent.some((e) => e.status === 'BLOCKED' || e.status === 'DENIED')
  return Math.min(1, (recent.length + batchIndex) * 0.2 + (priorBlocked ? 0.4 : 0))
}

function stripLLM(a: ContentAnalysis): SecurityEvent['analysis'] {
  const { llm, ...rest } = a
  return { ...rest, llm_model: llm?.model, llm_latency_ms: llm?.latency_ms }
}

interface InterceptInput {
  runId: string
  scenarioId: string | null
  scenarioTitle: string
  message: InboundMessage
  source: Source
  senderTrust: SenderTrust
  context: RequestContext
  toolCalls: ToolCall[]
  analysis: ContentAnalysis
  timestamp?: number
  seeded?: boolean
}

/** The SentinelMesh gateway: every Atlas tool call must pass through here. */
function intercept(store: Store, input: InterceptInput): SecurityEvent[] {
  const now = input.timestamp ?? Date.now()
  return input.toolCalls.map((toolCall, index) => {
    const gateway = decide({
      toolCall,
      message: input.message,
      senderTrust: input.senderTrust,
      context: input.context,
      analysis: input.analysis,
      policies: store.policies,
      behavior: input.seeded ? 0 : behaviorScore(store, input.message.from, index, now),
    })
    const device = TOOLS[toolCall.tool].device
    const event: SecurityEvent = {
      id: store.nextId++,
      runId: input.runId,
      timestamp: new Date(now + index * 400).toISOString(),
      scenarioId: input.scenarioId,
      scenarioTitle: input.scenarioTitle,
      source: input.source,
      sender: input.message.from,
      senderTrust: input.senderTrust,
      subject: input.message.subject ?? '',
      contentDigest: digest(input.message),
      contentPreview: input.message.body.length > 320 ? `${input.message.body.slice(0, 317)}...` : input.message.body,
      context: input.context,
      agent: 'Atlas',
      toolCall,
      status: gateway.decision === 'ALLOW' ? 'ALLOWED' : gateway.decision === 'BLOCK' ? 'BLOCKED' : 'PENDING',
      gateway,
      analysis: stripLLM(input.analysis),
      executed: false,
      deviceBefore: store.devices[device],
      seeded: input.seeded,
    }
    if (event.status === 'ALLOWED' && !input.seeded) {
      store.devices = simulatorAdapter.execute(store.devices, toolCall, { eventId: event.id, decision: 'ALLOW' })
      event.executed = true
      event.deviceAfter = store.devices[device]
    }
    store.events.unshift(event)
    return event
  })
}

function toToolCalls(proposed: ProposedToolCall[], source: Source): ToolCall[] {
  return proposed
    .filter((p) => p.tool in TOOLS)
    .map((p) => ({ ...p, id: `tc_${randomUUID().slice(0, 8)}`, agent: 'Atlas' as const, source }))
}

export interface RunInput {
  scenarioId?: string
  custom?: {
    message: InboundMessage
    source: Source
    senderTrust: SenderTrust
    context: RequestContext
  }
  useAI: boolean
}

export async function runAgent(input: RunInput): Promise<RunResult> {
  const store = getStore()
  const scenario = input.scenarioId ? ALL_SCENARIOS.find((s) => s.id === input.scenarioId) : undefined
  if (input.scenarioId && !scenario) throw new Error('Unknown scenario')

  const message = scenario?.message ?? input.custom!.message
  const source = scenario?.source ?? input.custom!.source
  const senderTrust = scenario?.sender_trust ?? input.custom!.senderTrust
  const context = scenario?.context ?? input.custom!.context

  let planner: RunResult['atlas']['planner'] = 'scenario'
  let thought: string
  let proposed: ProposedToolCall[]
  if (scenario) {
    proposed = scenario.tool_calls
    thought = `Message says to ${proposed.map((t) => t.tool.replaceAll('_', ' ')).join(' and ')}. I'll do that now.`
  } else {
    const local = planLocally(message)
    ;({ thought, toolCalls: proposed } = local)
    planner = 'local'
    if (input.useAI) {
      try {
        const plan = await planWithLLM(message)
        if (plan.toolCalls.length || !local.toolCalls.length) {
          ;({ thought, toolCalls: proposed } = plan)
          planner = 'llm'
        }
      } catch (e) {
        console.log('[v0] Atlas LLM planner unavailable, using local planner:', (e as Error).message)
      }
    }
  }

  const toolCalls = toToolCalls(proposed, source)
  const local = analyzeLocally(message, source, senderTrust, proposed)
  let analysis: ContentAnalysis = local
  if (input.useAI && toolCalls.length) {
    try {
      analysis = mergeAnalysis(local, await analyzeWithLLM(message, source, senderTrust, proposed))
      store.aiAvailable = true
    } catch (e) {
      const reason = /credit card/i.test((e as Error).message)
        ? 'AI Gateway needs a card on file for this Vercel team'
        : 'model unreachable or timed out'
      analysis = { ...local, llm_error: `AI analysis unavailable (${reason}). Used deterministic local analysis.` }
      store.aiAvailable = false
      console.log('[v0] LLM threat analysis failed, falling back to local:', (e as Error).message)
    }
  }

  const runId = `run_${randomUUID().slice(0, 8)}`
  const events = intercept(store, {
    runId,
    scenarioId: scenario?.id ?? null,
    scenarioTitle: scenario?.title ?? 'Custom message',
    message,
    source,
    senderTrust,
    context,
    toolCalls,
    analysis,
  })

  return { runId, atlas: { thought, planner, toolCalls }, analysis, events }
}

export function resolveApproval(eventId: number, action: 'approve' | 'block') {
  const store = getStore()
  const event = store.events.find((e) => e.id === eventId)
  if (!event) throw new Error('Event not found')
  if (event.status !== 'PENDING') throw new Error('Event is not awaiting approval')
  event.resolvedBy = 'human'
  if (action === 'approve') {
    const device = TOOLS[event.toolCall.tool].device
    event.deviceBefore = store.devices[device]
    store.devices = simulatorAdapter.execute(store.devices, event.toolCall, { eventId, decision: 'APPROVED' })
    event.executed = true
    event.deviceAfter = store.devices[device]
    event.status = 'APPROVED'
  } else {
    event.status = 'DENIED'
  }
  return event
}

export function setPolicyEnabled(id: string, enabled: boolean) {
  const store = getStore()
  const rule = store.policies.find((p) => p.id === id)
  if (!rule) throw new Error('Unknown policy')
  rule.enabled = enabled
  return rule
}

/** Dry-run evaluation used by the Context Lab. Never touches devices or the audit log. */
export function dryRun(input: {
  tool: ToolCall['tool']
  source: Source
  senderTrust: SenderTrust
  context: RequestContext
}) {
  const store = getStore()
  const message: InboundMessage = { channel: 'lab', from: 'context-lab', body: '' }
  const proposed = [{ tool: input.tool, args: {} }]
  const toolCall = toToolCalls(proposed, input.source)[0]
  const analysis = analyzeLocally(message, input.source, input.senderTrust, proposed)
  return decide({
    toolCall,
    message,
    senderTrust: input.senderTrust,
    context: input.context,
    analysis,
    policies: store.policies,
    behavior: 0,
  })
}

function computeStats(events: SecurityEvent[]): Stats {
  return {
    threatsDetected: events.filter((e) => e.analysis.threat_types.length > 0 || e.gateway.risk.score > 40).length,
    blockedActions: events.filter((e) => e.status === 'BLOCKED' || e.status === 'DENIED').length,
    humanApprovals: events.filter((e) => e.resolvedBy === 'human').length,
    safeActions: events.filter((e) => e.status === 'ALLOWED' || e.status === 'APPROVED').length,
    pending: events.filter((e) => e.status === 'PENDING').length,
  }
}

export function getDashboardState(): DashboardState {
  const store = getStore()
  return {
    devices: store.devices,
    events: store.events.slice(0, 150),
    pending: store.events.filter((e) => e.status === 'PENDING'),
    policies: store.policies,
    stats: computeStats(store.events),
    aiAvailable: store.aiAvailable,
    model: LLM_MODEL,
  }
}

/**
 * Replays every demo scenario through the real gateway with back-dated
 * timestamps so charts have a baseline. Seeded events never execute device
 * commands and are labeled in the audit log.
 */
function seedBaseline(store: Store) {
  const start = Date.now() - 55 * 60_000
  const order = [...ALL_SCENARIOS, ...ALL_SCENARIOS.filter((s) => s.kind === 'safe')]
  order.forEach((scenario, i) => {
    const toolCalls = toToolCalls(scenario.tool_calls, scenario.source)
    const events = intercept(store, {
      runId: `seed_${i}`,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      message: scenario.message,
      source: scenario.source,
      senderTrust: scenario.sender_trust,
      context: scenario.context,
      toolCalls,
      analysis: analyzeLocally(scenario.message, scenario.source, scenario.sender_trust, scenario.tool_calls),
      timestamp: start + i * 3.2 * 60_000,
      seeded: true,
    })
    for (const e of events) {
      if (e.status === 'PENDING') {
        e.status = 'DENIED'
        e.resolvedBy = 'human'
      }
    }
  })
}
