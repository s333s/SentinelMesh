'use client'

import { useState } from 'react'
import type { DashboardState, RunResult, Scenario, SecurityEvent } from '@/lib/sentinel/types'
import { postJson, useDashboard } from '@/hooks/use-dashboard'
import { ApprovalsPanel } from './approvals-panel'
import { AttackLab, type RunRequest } from './attack-lab'
import { DevicePanel } from './device-panel'
import { EventDetailDialog } from './event-detail-dialog'
import { EventLog } from './event-log'
import { Header } from './header'
import { PolicyPanel } from './policy-panel'
import { RiskChart } from './risk-chart'
import { RunTrace } from './run-trace'
import { StatsBar } from './stats-bar'

interface DashboardProps {
  initialState: DashboardState
  attacks: Scenario[]
  safe: Scenario[]
}

export function Dashboard({ initialState, attacks, safe }: DashboardProps) {
  const { data, mutate } = useDashboard(initialState)
  const state = data ?? initialState
  const [run, setRun] = useState<RunResult | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [busyApproval, setBusyApproval] = useState<number | null>(null)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selected: SecurityEvent | null =
    selectedId === null ? null : (state.events.find((e) => e.id === selectedId) ?? run?.events.find((e) => e.id === selectedId) ?? null)

  const guard = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleRun = (req: RunRequest, label: string) =>
    guard(async () => {
      setRunning(label)
      try {
        setRun(await postJson<RunResult>('/api/agent/run', req))
        await mutate()
      } finally {
        setRunning(null)
      }
    })

  const handleResolve = (id: number, action: 'approve' | 'block') =>
    guard(async () => {
      setBusyApproval(id)
      try {
        await postJson(`/api/approvals/${id}`, { action })
        await mutate()
      } finally {
        setBusyApproval(null)
      }
    })

  const handleToggle = (id: string, enabled: boolean) =>
    guard(async () => {
      await mutate(
        async () => {
          await postJson('/api/policies', { id, enabled })
          return undefined
        },
        {
          optimisticData: { ...state, policies: state.policies.map((p) => (p.id === id ? { ...p, enabled } : p)) },
          rollbackOnError: true,
          populateCache: false,
          revalidate: true,
        },
      )
    })

  const handleReset = () =>
    guard(async () => {
      setResetting(true)
      try {
        await postJson('/api/reset')
        setRun(null)
        await mutate()
      } finally {
        setResetting(false)
      }
    })

  const open = (e: SecurityEvent) => setSelectedId(e.id)

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-6 md:px-6">
      <Header aiAvailable={state.aiAvailable} model={state.model} onReset={handleReset} resetting={resetting} />

      {error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <StatsBar stats={state.stats} />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <AttackLab attacks={attacks} safe={safe} running={running} onRun={handleRun} />
        </div>
        <div className="lg:col-span-5">
          <RunTrace run={run} onOpen={open} />
        </div>
        <div className="flex flex-col gap-5 lg:col-span-3">
          <DevicePanel devices={state.devices} />
          <ApprovalsPanel pending={state.pending} busyId={busyApproval} onResolve={handleResolve} onOpen={open} />
        </div>
      </div>

      <RiskChart events={state.events} />

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <EventLog events={state.events} onOpen={open} />
        </div>
        <div className="lg:col-span-4">
          <PolicyPanel policies={state.policies} onToggle={handleToggle} />
        </div>
      </div>

      <EventDetailDialog event={selected} onOpenChange={(o) => !o && setSelectedId(null)} />
    </div>
  )
}
