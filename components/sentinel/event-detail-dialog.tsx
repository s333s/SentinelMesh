'use client'

import type { SecurityEvent } from '@/lib/sentinel/types'
import { SOURCE_LABELS, TOOLS } from '@/lib/sentinel/catalog'
import { formatTime, statusStyles } from '@/lib/sentinel/format'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DecisionDetails } from './decision-details'

export function EventDetailDialog({ event, onOpenChange }: { event: SecurityEvent | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={event !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] p-0 sm:max-w-2xl">
        {event && (
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              <DialogHeader className="mb-5">
                <div className="flex items-center gap-2">
                  <span className={`rounded border px-2 py-0.5 text-xs font-medium ${statusStyles[event.status].className}`}>
                    {statusStyles[event.status].label}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">#{event.id} · {formatTime(event.timestamp)}</span>
                </div>
                <DialogTitle className="mt-2 text-balance">
                  {TOOLS[event.toolCall.tool].label}{' '}
                  <span className="font-mono text-sm font-normal text-muted-foreground">{event.toolCall.tool}</span>
                </DialogTitle>
                <DialogDescription>
                  {event.scenarioTitle} · {SOURCE_LABELS[event.source]} from <span className="font-mono">{event.sender}</span> ({event.senderTrust})
                </DialogDescription>
              </DialogHeader>

              <div className="mb-5 grid grid-cols-2 gap-2 font-mono text-[11px] text-muted-foreground sm:grid-cols-4">
                <div className="rounded border border-border p-2">time {event.context.time}</div>
                <div className="rounded border border-border p-2">user {event.context.user_present ? 'home' : 'away'}</div>
                <div className="rounded border border-border p-2">engine {event.analysis.engine}</div>
                <div className="rounded border border-border p-2">
                  {event.executed ? `${event.deviceBefore} → ${event.deviceAfter}` : 'not executed'}
                </div>
              </div>

              <div className="mb-5 rounded-md border border-border bg-background/40 p-3">
                <p className="flex justify-between gap-2 text-xs text-muted-foreground">
                  <span>Content the agent read</span>
                  <span className="font-mono">sha256:{event.contentDigest}</span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-pretty">{event.contentPreview}</p>
              </div>

              <DecisionDetails event={event} />
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}
