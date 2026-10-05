import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PanelProps {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}

export function Panel({ title, description, action, children, className, id }: PanelProps) {
  const headingId = id ? `${id}-heading` : undefined
  return (
    <section aria-labelledby={headingId} className={cn('flex flex-col rounded-lg border border-border bg-card', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 id={headingId} className="text-sm font-medium">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{description}</p>}
        </div>
        {action}
      </div>
      <div className="flex-1 p-4">{children}</div>
    </section>
  )
}
