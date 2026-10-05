import { getDashboardState } from '@/lib/sentinel/store'

export const dynamic = 'force-dynamic'

export function GET() {
  return Response.json(getDashboardState())
}
