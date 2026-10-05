import { getDashboardState, resetStore } from '@/lib/sentinel/store'

export function POST() {
  resetStore()
  return Response.json(getDashboardState())
}
