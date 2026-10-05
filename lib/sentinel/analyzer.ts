import { isExternal, TOOLS } from './catalog'
import type { ContentAnalysis, InboundMessage, ProposedToolCall, SenderTrust, Source, ThreatType } from './types'

interface SignalRule {
  label: string
  pattern: RegExp
}

const URGENCY: SignalRule[] = [
  { label: 'urgency keyword', pattern: /\b(urgent|immediately|asap|right now|act now|time[- ]sensitive)\b/i },
  { label: 'consequence threat', pattern: /\b(avoid (service )?cancellation|offer expires|will be (cancelled|suspended)|lives are at risk)\b/i },
  { label: 'deadline pressure', pattern: /\b(within \d+ (minutes|hours)|starting now|do not wait)\b/i },
]

const AUTHORITY: SignalRule[] = [
  { label: 'claims administrator authority', pattern: /\b(system administrator|it admin|administrator|authorized by management)\b/i },
  { label: 'claims emergency service', pattern: /\b(fire department|fire dispatch|police|paramedic|emergency services)\b/i },
  { label: 'claims official role', pattern: /\b(security team|compliance audit|hoa|maintenance team|technician)\b/i },
]

const INJECTION: SignalRule[] = [
  { label: 'instruction override', pattern: /\b(ignore|disregard) (all )?(previous|prior|above) (instructions|rules)\b/i },
  { label: 'role hijack', pattern: /\b(you are now|act as|maintenance mode|developer mode|jailbreak)\b/i },
  { label: 'fake system directive', pattern: /(^|\W)(system|assistant)\s*:/i },
  { label: 'hidden markup', pattern: /<!--[\s\S]*?-->|\u200b|display:\s*none/i },
  { label: 'direct tool invocation', pattern: /\b(call|invoke|execute)\s+[a-z_]+\(?\)?/i },
  { label: 'policy override demand', pattern: /\boverride (all )?(security )?(policies|policy|rules)\b/i },
]

const SECRECY: SignalRule[] = [
  { label: 'secrecy request', pattern: /\b(do not (notify|tell|mention|inform)|don't tell|keep this (quiet|confidential)|confidential procedure)\b/i },
]

const PRETEXT: SignalRule[] = [
  { label: 'friendly pretext opener', pattern: /\b(hope you('| a)re (having|doing)|wonderful day|kindly|thank you so much)\b/i },
  { label: 'plausible errand story', pattern: /\b(drop(ping)? off|replacement|delivery|parcel|package|remote you requested)\b/i },
]

const PHYSICAL_REQUEST = /\b(unlock|disarm|disable (the |all )?(alarm|camera|cameras)|open (the )?garage|turn off (the )?(alarm|camera)|cameras? off)\b/i

const SUSPICIOUS_DOMAIN = /@[^\s]*(security|support|admin|delivery|deals|optimizer|facilities)[^\s]*\.(example|xyz|top|info|biz)/i

function matchAll(rules: SignalRule[], text: string) {
  return rules.filter((r) => r.pattern.test(text)).map((r) => r.label)
}

const clamp = (n: number) => Math.max(0, Math.min(1, n))

export function analyzeLocally(
  message: InboundMessage,
  source: Source,
  senderTrust: SenderTrust,
  proposed: ProposedToolCall[],
): ContentAnalysis {
  const text = `${message.subject ?? ''}\n${message.body}`
  const external = isExternal(source)
  const untrusted = senderTrust === 'unknown' || senderTrust === 'spoofed'

  const urgencyHits = matchAll(URGENCY, text)
  const authorityHits = matchAll(AUTHORITY, text)
  const injectionHits = matchAll(INJECTION, text)
  const secrecyHits = matchAll(SECRECY, text)
  const pretextHits = matchAll(PRETEXT, text)
  const asksPhysical = PHYSICAL_REQUEST.test(text)
  const lookalikeDomain = SUSPICIOUS_DOMAIN.test(message.from)
  const maxSeverity = Math.max(0, ...proposed.map((p) => TOOLS[p.tool].severity))

  const urgency = clamp(urgencyHits.length * 0.38)
  const impersonation = clamp(
    (authorityHits.length ? 0.35 + authorityHits.length * 0.15 : 0) +
      (lookalikeDomain ? 0.3 : 0) +
      (senderTrust === 'spoofed' ? 0.25 : 0),
  )
  const imperativeDeviceCommandFromExternal = external && asksPhysical ? 0.3 : 0
  const injection = clamp(injectionHits.length * 0.28 + imperativeDeviceCommandFromExternal)
  const pretext = untrusted ? clamp(pretextHits.length * 0.3) : 0

  const content_risk = clamp(
    0.05 +
      (external ? 0.15 : 0) +
      (untrusted ? 0.15 : 0) +
      urgency * 0.2 +
      impersonation * 0.2 +
      injection * 0.25 +
      (secrecyHits.length ? 0.2 : 0) +
      pretext * 0.2 +
      (asksPhysical && untrusted ? 0.15 : 0),
  )

  const threat_types: ThreatType[] = []
  if (untrusted && (urgency > 0.3 || impersonation > 0.3 || pretext > 0.3 || secrecyHits.length))
    threat_types.push('social_engineering')
  if (injection >= 0.5) threat_types.push('potential_prompt_injection')
  if (impersonation >= 0.4) threat_types.push('potential_impersonation')
  if (urgency >= 0.35 && untrusted) threat_types.push('suspicious_urgency')
  if (pretext >= 0.5) threat_types.push('pretexting')
  if (/override/i.test(text)) threat_types.push('policy_override_attempt')
  if (secrecyHits.length) threat_types.push('secrecy_request')

  const signals = [
    ...urgencyHits.map((s) => `Urgency: ${s}`),
    ...authorityHits.map((s) => `Authority claim: ${s}`),
    ...injectionHits.map((s) => `Injection: ${s}`),
    ...secrecyHits.map((s) => `Secrecy: ${s}`),
    ...(untrusted ? pretextHits.map((s) => `Pretext: ${s}`) : []),
    ...(lookalikeDomain ? ['Sender: look-alike / unaffiliated domain'] : []),
    ...(external && asksPhysical ? ['External content contains physical-access commands'] : []),
  ]

  const intent = proposed.length
    ? `${maxSeverity >= 0.7 ? 'Change physical security state' : 'Adjust comfort / utility device'}: ${proposed
        .map((p) => TOOLS[p.tool].label.toLowerCase())
        .join(', ')}`
    : 'No device action requested'

  return {
    engine: 'local',
    intent,
    threat_types,
    urgency: round(urgency),
    injection: round(injection),
    impersonation: round(impersonation),
    content_risk: round(content_risk),
    signals,
  }
}

const round = (n: number) => Math.round(n * 100) / 100
