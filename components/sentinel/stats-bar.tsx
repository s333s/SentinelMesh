import { CheckCircle2, Hand, ShieldAlert, ShieldX } from 'lucide-react'
import type { Stats } from '@/lib/sentinel/types'

export function StatsBar({ stats }: { stats: Stats }) {
  const items = [
    { label: 'Threats detected', value: stats.threatsDetected, icon: ShieldAlert, tone: 'text-danger' },
    { label: 'Actions blocked', value: stats.blockedActions, icon: ShieldX, tone: 'text-danger' },
    { label: 'Human approvals', value: stats.humanApprovals, icon: Hand, tone: 'text-warn', hint: stats.pending ? `${stats.pending} pending` : undefined },
    { label: 'Safe actions executed', value: stats.safeActions, icon: CheckCircle2, tone: 'text-safe' },
  ]
  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-card p-4">
          <dt className="flex items-center gap-2 text-xs text-muted-foreground">
            <item.icon className={`size-3.5 ${item.tone}`} aria-hidden="true" />
            {item.label}
          </dt>
          <dd className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums">{item.value}</span>
            {item.hint && <span className="text-xs text-warn">{item.hint}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
