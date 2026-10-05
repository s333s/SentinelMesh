'use client'

import { RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface HeaderProps {
  aiAvailable: boolean
  model: string
  onReset: () => void
  resetting: boolean
}

export function Header({ aiAvailable, model, onReset, resetting }: HeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/30">
          <ShieldCheck className="size-5" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-balance">SentinelMesh</h1>
          <p className="text-sm text-muted-foreground">Zero-trust security gateway for AI agents controlling physical devices</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-safe opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-safe" />
          </span>
          Gateway enforcing
        </span>
        <span
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-xs text-muted-foreground"
          title={aiAvailable ? `AI analysis via ${model}` : 'AI unavailable — deterministic local analysis active'}
        >
          <span className={`size-2 rounded-full ${aiAvailable ? 'bg-primary' : 'bg-warn'}`} aria-hidden="true" />
          {aiAvailable ? `AI: ${model}` : 'AI: local fallback'}
        </span>
        <Button variant="outline" size="sm" onClick={onReset} disabled={resetting}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Reset demo
        </Button>
      </div>
    </header>
  )
}
