import { isExternal, TOOLS } from './catalog'
import type {
  ContentAnalysis,
  Decision,
  PolicyResult,
  PolicyRule,
  RequestContext,
  SenderTrust,
  ToolCall,
  TriggeredRule,
} from './types'

export const THERMOSTAT_LIMITS = { min: 16, max: 28 }
export const DOOR_HOURS = { start: 7, end: 22 }

export const DEFAULT_POLICIES: PolicyRule[] = [
  { id: 'fd_unknown_sender', device: 'front_door', verdict: 'BLOCK', enabled: true, description: 'Unknown or spoofed sender cannot unlock the front door' },
  { id: 'fd_no_external', device: 'front_door', verdict: 'BLOCK', enabled: true, description: 'External email, SMS, documents or voicemail cannot directly trigger unlock' },
  { id: 'fd_ai_needs_human', device: 'front_door', verdict: 'REQUIRE_APPROVAL', enabled: true, description: 'AI cannot unlock without human approval unless a verified on-site user asks' },
  { id: 'fd_hours', device: 'front_door', verdict: 'REQUIRE_APPROVAL', enabled: true, description: `Unlock allowed only between ${pad(DOOR_HOURS.start)}:00 and ${pad(DOOR_HOURS.end)}:00` },
  { id: 'al_ai_cannot_disable', device: 'alarm', verdict: 'REQUIRE_APPROVAL', enabled: true, description: 'AI cannot disable the alarm on its own; a human must approve' },
  { id: 'al_external_no_override', device: 'alarm', verdict: 'BLOCK', enabled: true, description: 'External requests can never override the alarm policy' },
  { id: 'cam_no_external_disable', device: 'camera', verdict: 'BLOCK', enabled: true, description: 'External requests cannot take the camera offline' },
  { id: 'cam_disable_needs_human', device: 'camera', verdict: 'REQUIRE_APPROVAL', enabled: true, description: 'Disabling the camera requires human approval' },
  { id: 'gr_untrusted_needs_human', device: 'garage', verdict: 'REQUIRE_APPROVAL', enabled: true, description: 'AI may open the garage when a trusted user is present or in a pre-approved delivery window; otherwise approval is required' },
  { id: 'lt_free', device: 'lights', verdict: 'ALLOW', enabled: true, description: 'AI can control lights freely' },
  { id: 'th_limits', device: 'thermostat', verdict: 'BLOCK', enabled: true, description: `Thermostat target must stay within ${THERMOSTAT_LIMITS.min}–${THERMOSTAT_LIMITS.max} °C` },
  { id: 'gl_injection', device: 'global', verdict: 'BLOCK', enabled: true, description: 'Tool calls derived from content with strong prompt-injection indicators are blocked' },
]

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function hourOf(time: string) {
  const h = Number.parseInt(time.split(':')[0] ?? '12', 10)
  return Number.isFinite(h) ? h : 12
}

const RANK: Record<Decision, number> = { ALLOW: 0, REQUIRE_APPROVAL: 1, BLOCK: 2 }
export const strictest = (...ds: Decision[]): Decision => ds.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), 'ALLOW')

interface PolicyInput {
  toolCall: ToolCall
  senderTrust: SenderTrust
  context: RequestContext
  analysis: ContentAnalysis
}

type RuleCheck = (input: PolicyInput) => boolean

const CHECKS: Record<string, RuleCheck> = {
  fd_unknown_sender: ({ toolCall, senderTrust }) =>
    toolCall.tool === 'unlock_front_door' && (senderTrust === 'unknown' || senderTrust === 'spoofed'),
  fd_no_external: ({ toolCall }) => toolCall.tool === 'unlock_front_door' && isExternal(toolCall.source),
  fd_ai_needs_human: ({ toolCall, senderTrust, context }) =>
    toolCall.tool === 'unlock_front_door' &&
    !(toolCall.source === 'local_user' && senderTrust === 'verified' && context.user_present),
  fd_hours: ({ toolCall, context }) => {
    const h = hourOf(context.time)
    return toolCall.tool === 'unlock_front_door' && (h < DOOR_HOURS.start || h >= DOOR_HOURS.end)
  },
  al_ai_cannot_disable: ({ toolCall }) => toolCall.tool === 'disable_alarm',
  al_external_no_override: ({ toolCall }) => toolCall.tool === 'disable_alarm' && isExternal(toolCall.source),
  cam_no_external_disable: ({ toolCall }) => toolCall.tool === 'disable_camera' && isExternal(toolCall.source),
  cam_disable_needs_human: ({ toolCall }) => toolCall.tool === 'disable_camera',
  gr_untrusted_needs_human: ({ toolCall, senderTrust, context }) => {
    if (toolCall.tool !== 'open_garage') return false
    const trustedPresent = context.user_present && (senderTrust === 'verified' || senderTrust === 'trusted')
    const deliveryWindow = !!context.approved_delivery_window && toolCall.source === 'partner_api' && senderTrust !== 'unknown' && senderTrust !== 'spoofed'
    return !(trustedPresent || deliveryWindow)
  },
  lt_free: () => false,
  th_limits: ({ toolCall }) =>
    toolCall.tool === 'set_thermostat' &&
    (typeof toolCall.args.target !== 'number' ||
      toolCall.args.target < THERMOSTAT_LIMITS.min ||
      toolCall.args.target > THERMOSTAT_LIMITS.max),
  gl_injection: ({ analysis, toolCall }) => analysis.injection >= 0.75 && !TOOLS[toolCall.tool].readOnly,
}

export function evaluatePolicies(rules: PolicyRule[], input: PolicyInput): PolicyResult {
  const triggered: TriggeredRule[] = []
  for (const rule of rules) {
    if (!rule.enabled || rule.verdict === 'ALLOW') continue
    const check = CHECKS[rule.id]
    if (check?.(input)) {
      triggered.push({ ruleId: rule.id, device: rule.device, description: rule.description, verdict: rule.verdict })
    }
  }
  return { verdict: strictest(...triggered.map((t) => t.verdict)), triggered }
}
