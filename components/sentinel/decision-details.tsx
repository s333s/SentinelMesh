import type { SecurityEvent } from '@/lib/sentinel/types'
import { decisionStyles } from '@/lib/sentinel/format'
import { RiskFactors, RiskMeter } from './risk-breakdown'

export function DecisionDetails({ event }: { event: SecurityEvent }) {
  const { gateway } = event
  const x = gateway.explanation
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-background/40 p-3">
          <p className="text-xs text-muted-foreground">Gateway decision</p>
          <p className={`mt-1.5 inline-flex rounded border px-2 py-0.5 font-mono text-xs font-semibold ${decisionStyles[gateway.decision].className}`}>
            {decisionStyles[gateway.decision].label}
          </p>
        </div>
        <div className="rounded-md border border-border bg-background/40 p-3">
          <p className="mb-2 text-xs text-muted-foreground">Risk score</p>
          <RiskMeter risk={gateway.risk} />
        </div>
      </div>

      <dl className="grid gap-3 text-sm">
        {[
          ['What happened', x.what_happened],
          ['Why it matters', x.why_it_matters],
          ['Without SentinelMesh', x.what_would_have_happened],
          ['What SentinelMesh did', x.sentinel_action],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs font-medium text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 leading-relaxed text-pretty">{v}</dd>
          </div>
        ))}
      </dl>

      {gateway.classifications.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Classification</h3>
          <ul className="flex flex-wrap gap-1.5">
            {gateway.classifications.map((c) => (
              <li key={c} className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-[11px]">
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">Policy rules triggered</h3>
        {gateway.policy.triggered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No policy rules triggered.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {gateway.policy.triggered.map((r) => (
              <li key={r.ruleId} className="flex items-start gap-2 text-xs">
                <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] ${decisionStyles[r.verdict].className}`}>
                  {r.verdict === 'REQUIRE_APPROVAL' ? 'APPROVAL' : r.verdict}
                </span>
                <span className="leading-relaxed">
                  {r.description} <span className="font-mono text-muted-foreground">({r.ruleId})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium text-muted-foreground">Risk factor breakdown</h3>
        <RiskFactors risk={gateway.risk} />
      </div>

      {event.analysis.signals.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">Content signals</h3>
          <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
            {event.analysis.signals.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
