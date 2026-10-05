'use client'

import { ArrowDown, Bot, Cpu, Mail, ShieldCheck, Sparkles } from 'lucide-react'
import type { RunResult, SecurityEvent } from '@/lib/sentinel/types'
import { SOURCE_LABELS, TOOLS } from '@/lib/sentinel/catalog'
import { decisionStyles } from '@/lib/sentinel/format'
import { Panel } from './panel'
import { RiskMeter } from './risk-breakdown'

function Step({ icon: Icon, label, children }: { icon: typeof Bot; label: string; children: React.ReactNode }) {
  return (
    <li className="relative flex gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 pb-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  )
}

function Verdict({ event, onOpen }: { event: SecurityEvent; onOpen: (e: SecurityEvent) => void }) {
  const d = event.gateway.decision
  const accent = d === 'ALLOW' ? 'border-safe/30' : d === 'BLOCK' ? 'border-danger/40' : 'border-warn/40'
  return (
    <div className={`rounded-md border bg-background/40 p-3 ${accent}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs">
          {event.toolCall.tool}
          {event.toolCall.args.duration ? `(duration=${event.toolCall.args.duration})` : event.toolCall.args.target !== undefined ? `(target=${event.toolCall.args.target})` : '()'}
        </span>
        <span className={`rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${decisionStyles[d].className}`}>
          {decisionStyles[d].label}
        </span>
      </div>
      <div className="mt-3">
        <RiskMeter risk={event.gateway.risk} size="sm" />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-pretty">{event.gateway.explanation.sentinel_action}</p>
      {d !== 'ALLOW' && (
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground text-pretty">
          <span className="font-medium text-foreground/80">Prevented: </span>
          {event.gateway.explanation.what_would_have_happened}
        </p>
      )}
      <button
        type="button"
        onClick={() => onOpen(event)}
        className="mt-3 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
      >
        View full security analysis
      </button>
    </div>
  )
}

export function RunTrace({ run, onOpen }: { run: RunResult | null; onOpen: (e: SecurityEvent) => void }) {
  if (!run) {
    return (
      <Panel id="trace" title="Live interception trace" description="Pick a scenario to watch Atlas act and SentinelMesh decide.">
        <div className="flex h-full min-h-72 flex-col items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="rounded border border-border px-2 py-1">Content</span>
            <ArrowDown className="size-3 -rotate-90" aria-hidden="true" />
            <span className="rounded border border-border px-2 py-1">Atlas</span>
            <ArrowDown className="size-3 -rotate-90" aria-hidden="true" />
            <span className="rounded border border-primary/40 px-2 py-1 text-primary">SentinelMesh</span>
            <ArrowDown className="size-3 -rotate-90" aria-hidden="true" />
            <span className="rounded border border-border px-2 py-1">Devices</span>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground text-pretty">
            The agent never touches a device directly. Every tool call is intercepted, scored and enforced here first.
          </p>
        </div>
      </Panel>
    )
  }

  const first = run.events[0]
  const { analysis } = run
  return (
    <Panel
      id="trace"
      title="Live interception trace"
      description={first?.scenarioTitle}
      action={
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          {analysis.engine === 'llm+local' ? <Sparkles className="size-3 text-primary" aria-hidden="true" /> : <Cpu className="size-3" aria-hidden="true" />}
          {analysis.engine === 'llm+local' ? 'AI + local' : 'Local engine'}
        </span>
      }
    >
      <ol className="flex flex-col gap-4" aria-live="polite">
        {first && (
          <Step icon={Mail} label={`Inbound · ${SOURCE_LABELS[first.source]}`}>
            <p className="font-mono text-[11px] text-muted-foreground">
              {first.sender} · trust: {first.senderTrust}
            </p>
            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-pretty">{first.contentPreview}</p>
          </Step>
        )}
        <Step icon={Bot} label="Atlas (home agent) reasoning">
          <p className="text-sm leading-relaxed text-pretty">{run.atlas.thought}</p>
          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
            Proposed {run.atlas.toolCalls.length} tool call{run.atlas.toolCalls.length === 1 ? '' : 's'}:{' '}
            {run.atlas.toolCalls.map((c) => TOOLS[c.tool].label.toLowerCase()).join(', ')}
          </p>
        </Step>
        <Step icon={ShieldCheck} label="SentinelMesh content analysis">
          {analysis.threat_types.length ? (
            <ul className="flex flex-wrap gap-1.5">
              {analysis.threat_types.map((t) => (
                <li key={t} className="rounded border border-danger/30 bg-danger/10 px-1.5 py-0.5 font-mono text-[11px] text-danger">
                  {t}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-safe">No manipulation signals detected.</p>
          )}
          {analysis.llm && <p className="mt-2 text-xs leading-relaxed text-muted-foreground text-pretty">{analysis.llm.why_it_matters}</p>}
          {analysis.llm_error && (
            <p className="mt-2 text-xs text-warn">{analysis.llm_error}. Deterministic engine decided.</p>
          )}
        </Step>
        <li className="flex flex-col gap-3">
          {run.events.map((e) => (
            <Verdict key={e.id} event={e} onOpen={onOpen} />
          ))}
        </li>
      </ol>
    </Panel>
  )
}
