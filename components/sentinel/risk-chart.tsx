'use client'

import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { SecurityEvent } from '@/lib/sentinel/types'
import { Panel } from './panel'

const colorFor = (status: SecurityEvent['status']) =>
  status === 'ALLOWED' || status === 'APPROVED' ? 'var(--safe)' : status === 'PENDING' ? 'var(--warn)' : 'var(--danger)'

export function RiskChart({ events }: { events: SecurityEvent[] }) {
  const data = [...events]
    .slice(0, 24)
    .reverse()
    .map((e) => ({ id: `#${e.id}`, score: e.gateway.risk.score, tool: e.toolCall.tool, status: e.status }))

  return (
    <Panel id="risk-chart" title="Risk timeline" description="Risk score per intercepted call. Dashed lines: 50 = needs approval, 90 = auto-block. Policy rules can block below that.">
      <div className="h-48" role="img" aria-label={`Bar chart of risk scores for the last ${data.length} intercepted tool calls`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
            <XAxis dataKey="id" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis domain={[0, 100]} ticks={[0, 50, 90]} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
            <ReferenceLine y={90} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.6} />
            <ReferenceLine y={50} stroke="var(--warn)" strokeDasharray="3 3" strokeOpacity={0.4} />
            <Tooltip
              cursor={{ fill: 'var(--accent)', opacity: 0.4 }}
              contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12 }}
              labelStyle={{ color: 'var(--muted-foreground)' }}
              formatter={(value, _name, item) => [`${value} — ${item.payload.status}`, item.payload.tool]}
            />
            <Bar dataKey="score" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {data.map((d) => (
                <Cell key={d.id} fill={colorFor(d.status)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  )
}
