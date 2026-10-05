import { connection } from 'next/server'
import { Dashboard } from '@/components/sentinel/dashboard'
import { ATTACK_SCENARIOS, SAFE_SCENARIOS } from '@/lib/sentinel/scenarios'
import { getDashboardState } from '@/lib/sentinel/store'

export default async function Page() {
  await connection()
  return (
    <main className="min-h-screen">
      <Dashboard initialState={getDashboardState()} attacks={ATTACK_SCENARIOS} safe={SAFE_SCENARIOS} />
    </main>
  )
}
