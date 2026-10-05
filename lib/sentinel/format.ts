import type { Decision, EventStatus, RiskLevel } from './types'

export const statusStyles: Record<EventStatus, { label: string; className: string }> = {
  ALLOWED: { label: 'Allowed', className: 'bg-safe/15 text-safe border-safe/30' },
  APPROVED: { label: 'Approved', className: 'bg-safe/15 text-safe border-safe/30' },
  PENDING: { label: 'Needs approval', className: 'bg-warn/15 text-warn border-warn/30' },
  BLOCKED: { label: 'Blocked', className: 'bg-danger/15 text-danger border-danger/30' },
  DENIED: { label: 'Denied', className: 'bg-danger/15 text-danger border-danger/30' },
}

export const decisionStyles: Record<Decision, { label: string; className: string }> = {
  ALLOW: { label: 'ALLOW', className: 'bg-safe/15 text-safe border-safe/30' },
  REQUIRE_APPROVAL: { label: 'REQUIRE APPROVAL', className: 'bg-warn/15 text-warn border-warn/30' },
  BLOCK: { label: 'BLOCK', className: 'bg-danger/15 text-danger border-danger/30' },
}

export const riskTextClass = (level: RiskLevel) =>
  level === 'CRITICAL' || level === 'HIGH' ? 'text-danger' : level === 'ELEVATED' ? 'text-warn' : 'text-safe'

export const riskBarClass = (score: number) => (score >= 61 ? 'bg-danger' : score >= 41 ? 'bg-warn' : 'bg-safe')

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
