export type Decision = 'ALLOW' | 'REQUIRE_APPROVAL' | 'BLOCK'

export type Source =
  | 'external_email'
  | 'external_sms'
  | 'shared_document'
  | 'external_voice'
  | 'local_user'
  | 'trusted_schedule'
  | 'admin_console'
  | 'partner_api'

export type SenderTrust = 'spoofed' | 'unknown' | 'known' | 'trusted' | 'verified'

export type DeviceId = 'front_door' | 'garage' | 'alarm' | 'camera' | 'lights' | 'thermostat'

export type ToolName =
  | 'unlock_front_door'
  | 'lock_front_door'
  | 'open_garage'
  | 'close_garage'
  | 'disable_alarm'
  | 'arm_alarm'
  | 'disable_camera'
  | 'enable_camera'
  | 'check_camera_status'
  | 'lights_on'
  | 'lights_off'
  | 'set_thermostat'

export type ThreatType =
  | 'social_engineering'
  | 'potential_prompt_injection'
  | 'potential_impersonation'
  | 'suspicious_urgency'
  | 'pretexting'
  | 'policy_override_attempt'
  | 'secrecy_request'

export interface InboundMessage {
  channel: string
  from: string
  subject?: string
  body: string
}

export interface RequestContext {
  time: string
  user_present: boolean
  approved_delivery_window?: boolean
}

export interface ToolCallArgs {
  duration?: number
  target?: number
}

export interface ProposedToolCall {
  tool: ToolName
  args: ToolCallArgs
}

export interface ToolCall extends ProposedToolCall {
  id: string
  agent: 'Atlas'
  source: Source
}

export interface Scenario {
  id: string
  kind: 'attack' | 'safe'
  title: string
  category: string
  summary: string
  message: InboundMessage
  source: Source
  sender_trust: SenderTrust
  context: RequestContext
  tool_calls: ProposedToolCall[]
  expected: Decision
}

export interface DeviceState {
  front_door: 'LOCKED' | 'UNLOCKED'
  garage: 'CLOSED' | 'OPEN'
  alarm: 'ARMED' | 'DISARMED'
  camera: 'ONLINE' | 'OFFLINE'
  lights: 'OFF' | 'ON'
  thermostat: number
}

export interface ContentAnalysis {
  engine: 'local' | 'llm+local'
  intent: string
  threat_types: ThreatType[]
  urgency: number
  injection: number
  impersonation: number
  content_risk: number
  signals: string[]
  llm?: {
    model: string
    latency_ms: number
    what_happened: string
    why_it_matters: string
    threat_types: ThreatType[]
    urgency: number
    injection: number
    impersonation: number
    content_risk: number
  }
  llm_error?: string
}

export interface RiskFactor {
  key: string
  label: string
  value: number
  weight: number
  contribution: number
}

export type RiskLevel = 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL'

export interface RiskAssessment {
  score: number
  level: RiskLevel
  factors: RiskFactor[]
}

export interface PolicyRule {
  id: string
  device: DeviceId | 'global'
  description: string
  verdict: Decision
  enabled: boolean
}

export interface TriggeredRule {
  ruleId: string
  device: DeviceId | 'global'
  description: string
  verdict: Decision
}

export interface PolicyResult {
  verdict: Decision
  triggered: TriggeredRule[]
}

export interface Explanation {
  what_happened: string
  why_it_matters: string
  what_would_have_happened: string
  sentinel_action: string
}

export interface GatewayDecision {
  decision: Decision
  risk: RiskAssessment
  policy: PolicyResult
  reasons: string[]
  classifications: string[]
  explanation: Explanation
}

export type EventStatus = 'ALLOWED' | 'BLOCKED' | 'PENDING' | 'APPROVED' | 'DENIED'

export interface SecurityEvent {
  id: number
  runId: string
  timestamp: string
  scenarioId: string | null
  scenarioTitle: string
  source: Source
  sender: string
  senderTrust: SenderTrust
  subject: string
  contentDigest: string
  contentPreview: string
  context: RequestContext
  agent: 'Atlas'
  toolCall: ToolCall
  status: EventStatus
  gateway: GatewayDecision
  analysis: Omit<ContentAnalysis, 'llm'> & { llm_model?: string; llm_latency_ms?: number }
  executed: boolean
  deviceBefore?: string | number
  deviceAfter?: string | number
  resolvedBy?: 'human'
  seeded?: boolean
}

export interface RunResult {
  runId: string
  atlas: {
    thought: string
    planner: 'scenario' | 'local' | 'llm'
    toolCalls: ToolCall[]
  }
  analysis: ContentAnalysis
  events: SecurityEvent[]
}

export interface Stats {
  threatsDetected: number
  blockedActions: number
  humanApprovals: number
  safeActions: number
  pending: number
}

export interface DashboardState {
  devices: DeviceState
  events: SecurityEvent[]
  pending: SecurityEvent[]
  policies: PolicyRule[]
  stats: Stats
  aiAvailable: boolean
  model: string
}
