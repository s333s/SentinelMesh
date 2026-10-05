import type { RiskAssessment } from '@/lib/sentinel/types'
import { riskBarClass, riskTextClass } from '@/lib/sentinel/format'

export function RiskMeter({ risk, size = 'md' }: { risk: RiskAssessment; size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={risk.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Risk score"
      >
        <div className={`h-full rounded-full transition-all duration-700 ${riskBarClass(risk.score)}`} style={{ width: `${risk.score}%` }} />
      </div>
      <span className={`font-mono tabular-nums ${size === 'md' ? 'text-sm' : 'text-xs'} ${riskTextClass(risk.level)}`}>
        {risk.score}/100 <span className="text-[11px]">{risk.level}</span>
      </span>
    </div>
  )
}

export function RiskFactors({ risk }: { risk: RiskAssessment }) {
  const max = Math.max(...risk.factors.map((f) => f.contribution), 1)
  return (
    <table className="w-full text-xs">
      <caption className="sr-only">Risk score contributions by factor</caption>
      <thead>
        <tr className="text-left text-muted-foreground">
          <th scope="col" className="pb-1.5 font-normal">Factor</th>
          <th scope="col" className="pb-1.5 font-normal">Signal</th>
          <th scope="col" className="pb-1.5 text-right font-normal">Points</th>
        </tr>
      </thead>
      <tbody>
        {risk.factors.map((f) => (
          <tr key={f.key} className="border-t border-border/60">
            <td className="py-1.5 pr-2">{f.label}</td>
            <td className="w-2/5 py-1.5 pr-2">
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/70" style={{ width: `${(f.contribution / max) * 100}%` }} />
              </div>
            </td>
            <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground">+{f.contribution.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
