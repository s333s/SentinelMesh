import attacks from '@/demo/attack_scenarios.json'
import safe from '@/demo/safe_scenarios.json'
import type { Scenario } from './types'

export const ATTACK_SCENARIOS = attacks as Scenario[]
export const SAFE_SCENARIOS = safe as Scenario[]
export const ALL_SCENARIOS: Scenario[] = [...ATTACK_SCENARIOS, ...SAFE_SCENARIOS]
