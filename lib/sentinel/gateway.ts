import { DEVICE_LABELS, isExternal, SOURCE_LABELS, TOOLS } from './catalog'
import { evaluatePolicies, hourOf, strictest } from './policies'
import { RISK_THRESHOLDS, scoreRisk } from './risk'
import type {
  ContentAnalysis,
  Decision,
  Explanation,
  GatewayDecision,
  InboundMessage,
  PolicyRule,
  RequestContext,
  SenderTrust,
  ToolCall,
} from './types'

export interface GatewayInput {
  toolCall: ToolCall
  message: InboundMessage
  senderTrust: SenderTrust
  context: RequestContext
  analysis: ContentAnalysis
  policies: PolicyRule[]
  behavior: number
}

/**
 * Deterministic and authoritative. The LLM only contributes analysis signals
 * (which can raise but never lower the local signals); the decision itself is
 * computed here from policy rules and the transparent risk formula.
 */
export function decide(input: GatewayInput): GatewayDecision {
  const { toolCall, senderTrust, context, analysis, policies, behavior } = input
  const tool = TOOLS[toolCall.tool]

  const policy = evaluatePolicies(policies, { toolCall, senderTrust, context, analysis })
  const risk = scoreRisk({ toolCall, senderTrust, context, analysis, policy, behavior })

  const riskVerdict: Decision =
    risk.score >= RISK_THRESHOLDS.block ? 'BLOCK' : risk.score >= RISK_THRESHOLDS.approval ? 'REQUIRE_APPROVAL' : 'ALLOW'
  const decision = tool.readOnly && policy.verdict === 'ALLOW' && risk.score < RISK_THRESHOLDS.block
    ? 'ALLOW'
    : strictest(policy.verdict, riskVerdict)

  const untrusted = senderTrust === 'unknown' || senderTrust === 'spoofed'
  const highImpact = tool.severity >= 0.7
  const h = hourOf(context.time)

  const reasons: string[] = []
  if (untrusted || isExternal(toolCall.source)) reasons.push('untrusted_source')
  if (highImpact) reasons.push('high_impact_action')
  if (policy.verdict === 'BLOCK') reasons.push('security_policy_violation')
  if (policy.verdict === 'REQUIRE_APPROVAL') reasons.push('requires_human_approval')
  if (analysis.threat_types.includes('potential_prompt_injection')) reasons.push('potential_prompt_injection')
  if (analysis.threat_types.includes('suspicious_urgency')) reasons.push('suspicious_urgency')
  if (analysis.threat_types.includes('potential_impersonation')) reasons.push('potential_impersonation')
  if ((h < 6 || h >= 23) && highImpact) reasons.push('off_hours_request')
  if (!context.user_present && highImpact) reasons.push('user_not_present')
  if (behavior >= 0.5) reasons.push('behavioral_anomaly')
  if (riskVerdict === 'BLOCK') reasons.push('risk_ceiling_exceeded')

  const classifications: string[] = []
  if (analysis.threat_types.includes('social_engineering') || analysis.threat_types.includes('pretexting'))
    classifications.push('Suspicious social engineering')
  if (analysis.threat_types.includes('suspicious_urgency')) classifications.push('Suspicious urgency')
  if (untrusted) classifications.push('Unverified identity')
  if (analysis.threat_types.includes('potential_impersonation')) classifications.push('Potential impersonation')
  if (analysis.threat_types.includes('potential_prompt_injection')) classifications.push('Potential prompt injection')
  if (highImpact) classifications.push('High-impact physical action')
  if (policy.triggered.length) classifications.push('Policy violation')
  if (isExternal(toolCall.source) && highImpact && analysis.threat_types.length)
    classifications.push('AI-agent manipulation attempt')

  return {
    decision,
    risk,
    policy,
    reasons,
    classifications,
    explanation: explain(input, decision, classifications),
  }
}

function explain(input: GatewayInput, decision: Decision, classifications: string[]): Explanation {
  const { toolCall, message, analysis } = input
  const tool = TOOLS[toolCall.tool]
  const sourceLabel = SOURCE_LABELS[toolCall.source].toLowerCase()
  const device = DEVICE_LABELS[tool.device].toLowerCase()

  const what_happened =
    analysis.llm?.what_happened ||
    `Atlas received a${/^[aeiou]/i.test(sourceLabel) ? 'n' : ''} ${sourceLabel} message from “${message.from}” and tried to call ${toolCall.tool}().`

  const why_it_matters =
    analysis.llm?.why_it_matters ||
    (classifications.some((c) => c !== 'High-impact physical action')
      ? `The message tried to make an AI agent change the ${device} based on content that SentinelMesh could not verify (${classifications
          .filter((c) => c !== 'Policy violation')
          .slice(0, 3)
          .join(', ')
          .toLowerCase()}). A scam message would then turn into a physical security incident.`
      : `The request comes from a trusted source, complies with the ${device} policy, and its context is consistent.`)

  const sentinel_action =
    decision === 'BLOCK'
      ? 'SentinelMesh intercepted the tool call and blocked it. No command was sent to the device.'
      : decision === 'REQUIRE_APPROVAL'
        ? 'SentinelMesh paused the tool call and asked a human to verify it. No command is sent until someone approves.'
        : 'SentinelMesh checked the request against policy and forwarded the command to the device.'

  return {
    what_happened,
    why_it_matters,
    what_would_have_happened: tool.consequence(toolCall.args),
    sentinel_action,
  }
}
