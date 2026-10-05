'use client'

import useSWR from 'swr'
import type { DashboardState } from '@/lib/sentinel/types'

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to load gateway state')
  return (await res.json()) as DashboardState
}

export function useDashboard(fallbackData?: DashboardState) {
  return useSWR<DashboardState>('/api/state', fetcher, {
    fallbackData,
    refreshInterval: 1500,
    revalidateOnFocus: true,
  })
}

export async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error ?? 'Request failed')
  return data as T
}
