'use client'

import { Check, Hand, X } from 'lucide-react'
import type { SecurityEvent } from '@/lib/sentinel/types'
import { TOOLS } from '@/lib/sentinel/catalog'
import { Button } from '@/components/ui/button'
import { Panel } from './panel'

interface ApprovalsPanelProps {
  pending: SecurityEvent[]
  busyId: number | null
  onResolve: (id: number, action: 'approve' | 'block') => void
  onOpen: (e: SecurityEvent) => void
}

export function ApprovalsPanel({ pending, busyId, onResolve, onOpen }: ApprovalsPanelProps) {
  return (
    <Panel
      id="approvals"
      title="Human approval queue"
      description="Held actions. Nothing executes until you decide."
      action={pending.length > 0 ? <span className="rounded bg-warn/15 px-1.5 py-0.5 font-mono text-xs text-warn">{pending.length}</span> : undefined}
    >
      {pending.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Hand className="size-4" aria-hidden="true" />
          No actions awaiting approval.
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {pending.map((e) => (
            <li key={e.id} className="rounded-md border border-warn/30 bg-warn/5 p-3">
              <button type="button" onClick={() => onOpen(e)} className="w-full text-left focus-visible:outline-2 focus-visible:outline-ring">
                <p className="text-sm font-medium">{TOOLS[e.toolCall.tool].label}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {e.sender} · risk {e.gateway.risk.score}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground text-pretty">{e.gateway.reasons[0]}</p>
              </button>
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="flex-1" disabled={busyId === e.id} onClick={() => onResolve(e.id, 'approve')}>
                  <Check className="size-3.5" aria-hidden="true" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" className="flex-1" disabled={busyId === e.id} onClick={() => onResolve(e.id, 'block')}>
                  <X className="size-3.5" aria-hidden="true" />
                  Block
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
