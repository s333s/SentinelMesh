'use client'

import type { PolicyRule } from '@/lib/sentinel/types'
import { decisionStyles } from '@/lib/sentinel/format'
import { Switch } from '@/components/ui/switch'
import { Panel } from './panel'

export function PolicyPanel({ policies, onToggle }: { policies: PolicyRule[]; onToggle: (id: string, enabled: boolean) => void }) {
  const active = policies.filter((p) => p.enabled).length
  return (
    <Panel
      id="policies"
      title="Zero-trust policies"
      description="Deterministic rules evaluated on every call. Toggle to see enforcement change."
      action={<span className="font-mono text-xs text-muted-foreground">{active}/{policies.length} on</span>}
    >
      <ul className="-mx-4 -my-4 max-h-[420px] divide-y divide-border/60 overflow-auto">
        {policies.map((p) => (
          <li key={p.id} className="flex items-start gap-3 px-4 py-2.5">
            <Switch
              id={`policy-${p.id}`}
              checked={p.enabled}
              onCheckedChange={(v) => onToggle(p.id, v)}
              className="mt-0.5"
            />
            <label htmlFor={`policy-${p.id}`} className={`min-w-0 flex-1 cursor-pointer ${p.enabled ? '' : 'opacity-50'}`}>
              <span className="block text-xs leading-relaxed text-pretty">{p.description}</span>
              <span className="mt-1 flex items-center gap-2">
                <span className={`rounded border px-1 py-px font-mono text-[10px] ${decisionStyles[p.verdict].className}`}>
                  {p.verdict === 'REQUIRE_APPROVAL' ? 'APPROVAL' : p.verdict}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">{p.id} · {p.device}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </Panel>
  )
}
