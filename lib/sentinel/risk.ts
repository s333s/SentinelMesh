import { isExternal, TOOLS, TRUST_RISK } from './catalog'
import { hourOf } from './policies'
import type { ContentAnalysis, PolicyResult, RequestContext, RiskAssessment, RiskFactor, RiskLevel, SenderTrust, ToolCall } from './types'

export const RISK_WEIGHTS = {
  identity: 0.18,
  content: 0.1,
  severity: 0.18,
  policy: 0.14,
  context: 0.1,
  behavior: 0.05,
  urgency: 0.1,
  injection: 0.15,
} as const

export const COMPOUND_WEIGHT = 18

export const RISK_THRESHOLDS = { block: 90, approval: 50 }

export function riskLevel(score: number): RiskLevel {
  if (score <= 20) return 'LOW'
  if (score <= 40) return 'MODERATE'
  if (score <= 60) return 'ELEVATED'
  if (score <= 80) return 'HIGH'
  return 'CRITICAL'
}

const ENTRY_DEVICES = new Set(['front_door', 'garage', 'alarm', 'camera'])

export function contextAnomaly(toolCall: ToolCall, context: RequestContext) {
  const h = hourOf(context.time)
  const night = h < 6 || h >= 23
  const entry = ENTRY_DEVICES.has(TOOLS[toolCall.tool].device) && !TOOLS[toolCall.tool].readOnly
  let v = 0
  if (night && entry) v += 0.6
  else if (night) v += 0.15
  if (!context.user_present && entry) v += 0.3
  if (isExternal(toolCall.source) && entry) v += 0.1
  return Math.min(1, v)
}

interface RiskInput {
  toolCall: ToolCall
  senderTrust: SenderTrust
  context: RequestContext
  analysis: ContentAnalysis
  policy: PolicyResult
  behavior: number
}

export function scoreRisk({ toolCall, senderTrust, context, analysis, policy, behavior }: RiskInput): RiskAssessment {
  const severity = TOOLS[toolCall.tool].severity
  const identity = TRUST_RISK[senderTrust]
  const policyValue = policy.verdict === 'BLOCK' ? 1 : policy.verdict === 'REQUIRE_APPROVAL' ? 0.5 : 0

  const raw: Array<[keyof typeof RISK_WEIGHTS, string, number]> = [
    ['identity', 'Identity trust (inverse)', identity],
    ['content', 'Content trust (inverse)', analysis.content_risk],
    ['severity', 'Requested action severity', severity],
    ['policy', 'Policy compliance (inverse)', policyValue],
    ['context', 'Context consistency (inverse)', contextAnomaly(toolCall, context)],
    ['behavior', 'Behavioral anomaly', behavior],
    ['urgency', 'Urgency manipulation', analysis.urgency],
    ['injection', 'Prompt-injection likelihood', analysis.injection],
  ]

  const factors: RiskFactor[] = raw.map(([key, label, value]) => {
    const weight = RISK_WEIGHTS[key]
    return { key, label, value: round(value), weight, contribution: round(value * weight * 100) }
  })

  const compound = severity * identity * COMPOUND_WEIGHT
  factors.push({
    key: 'compound',
    label: 'Untrusted source × high-impact action',
    value: round(severity * identity),
    weight: COMPOUND_WEIGHT / 100,
    contribution: round(compound),
  })

  const score = Math.max(0, Math.min(100, Math.round(factors.reduce((sum, f) => sum + f.contribution, 0))))
  return { score, level: riskLevel(score), factors }
}

const round = (n: number) => Math.round(n * 100) / 100
