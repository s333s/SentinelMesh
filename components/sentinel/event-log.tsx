'use client'

import type { SecurityEvent } from '@/lib/sentinel/types'
import { SOURCE_LABELS } from '@/lib/sentinel/catalog'
import { formatTime, riskTextClass, statusStyles } from '@/lib/sentinel/format'
import { Panel } from './panel'

export function EventLog({ events, onOpen }: { events: SecurityEvent[]; onOpen: (e: SecurityEvent) => void }) {
  return (
    <Panel id="event-log" title="Security event log" description="Every intercepted tool call, newest first. Select a row for full analysis.">
      <div className="-mx-4 -my-4 max-h-[420px] overflow-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="sticky top-0 bg-card text-muted-foreground">
            <tr className="border-b border-border">
              <th scope="col" className="px-4 py-2 font-normal">Time</th>
              <th scope="col" className="px-2 py-2 font-normal">Source</th>
              <th scope="col" className="px-2 py-2 font-normal">Sender</th>
              <th scope="col" className="px-2 py-2 font-normal">Tool call</th>
              <th scope="col" className="px-2 py-2 text-right font-normal">Risk</th>
              <th scope="col" className="px-4 py-2 font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No events yet.</td>
              </tr>
            )}
            {events.map((e) => (
              <tr
                key={e.id}
                tabIndex={0}
                onClick={() => onOpen(e)}
                onKeyDown={(k) => (k.key === 'Enter' || k.key === ' ') && (k.preventDefault(), onOpen(e))}
                className="cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none"
              >
                <td className="px-4 py-2 font-mono tabular-nums text-muted-foreground">{formatTime(e.timestamp)}</td>
                <td className="px-2 py-2">{SOURCE_LABELS[e.source]}</td>
                <td className="max-w-44 truncate px-2 py-2 font-mono text-muted-foreground">{e.sender}</td>
                <td className="px-2 py-2 font-mono">{e.toolCall.tool}</td>
                <td className={`px-2 py-2 text-right font-mono tabular-nums ${riskTextClass(e.gateway.risk.level)}`}>{e.gateway.risk.score}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex rounded border px-1.5 py-0.5 text-[11px] ${statusStyles[e.status].className}`}>
                    {statusStyles[e.status].label}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}
