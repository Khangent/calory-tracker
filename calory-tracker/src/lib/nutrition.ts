import type { ActivityLevel, Sex } from '../types'

export interface ActivityDef {
  key: ActivityLevel
  label: string
  desc: string
  factor: number
}

/** Standard activity multipliers applied to BMR to get TDEE. */
export const ACTIVITY_LEVELS: ActivityDef[] = [
  { key: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise, desk job', factor: 1.2 },
  { key: 'light', label: 'Lightly active', desc: 'Light exercise 1–3 days/week', factor: 1.375 },
  { key: 'moderate', label: 'Moderately active', desc: 'Exercise 3–5 days/week', factor: 1.55 },
  { key: 'active', label: 'Very active', desc: 'Hard exercise 6–7 days/week', factor: 1.725 },
  { key: 'athlete', label: 'Extra active', desc: 'Athlete / physical job', factor: 1.9 },
]

export function activityDef(level: ActivityLevel): ActivityDef {
  return ACTIVITY_LEVELS.find((a) => a.key === level) ?? ACTIVITY_LEVELS[2]
}

/** ~7700 kcal per kg of body mass (≈3500 kcal per lb). */
export const KCAL_PER_KG = 7700

/** Mifflin-St Jeor basal metabolic rate (kcal/day). */
export function bmrMifflin(weightKg: number, heightCm: number, age: number, sex: Sex): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(base + (sex === 'male' ? 5 : -161))
}

export function tdee(bmr: number, level: ActivityLevel): number {
  return Math.round(bmr * activityDef(level).factor)
}

export type GoalDirection = 'lose' | 'gain' | 'maintain'

export interface PlanResult {
  bmr: number
  maintenance: number // TDEE at chosen activity level
  direction: GoalDirection
  /** Recommended daily intake to hit the goal at the chosen pace. */
  targetCalories: number
  /** Daily deficit (negative) or surplus (positive) vs maintenance. */
  dailyAdjustment: number
  /** Effective weekly rate after safety clamping (kg/week, signed: negative = losing). */
  effectiveWeeklyKg: number
  /** Whether the recommendation was raised to the safe floor. */
  clamped: boolean
  weeksToGoal: number | null
}

const SAFE_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 }

export function buildPlan(opts: {
  currentKg: number
  targetKg: number
  heightCm: number
  age: number
  sex: Sex
  level: ActivityLevel
  weeklyRateKg: number
}): PlanResult {
  const { currentKg, targetKg, heightCm, age, sex, level, weeklyRateKg } = opts
  const bmr = bmrMifflin(currentKg, heightCm, age, sex)
  const maintenance = tdee(bmr, level)

  const diff = targetKg - currentKg // negative => need to lose
  const direction: GoalDirection = diff < -0.1 ? 'lose' : diff > 0.1 ? 'gain' : 'maintain'

  const rate = Math.max(0, weeklyRateKg)
  const dailyChange = (rate * KCAL_PER_KG) / 7 // kcal/day magnitude

  let target = maintenance
  if (direction === 'lose') target = maintenance - dailyChange
  else if (direction === 'gain') target = maintenance + dailyChange

  // safety floor for very aggressive deficits
  const floor = SAFE_FLOOR[sex]
  let clamped = false
  if (direction === 'lose' && target < floor) {
    target = floor
    clamped = true
  }
  target = Math.round(target)

  const dailyAdjustment = target - maintenance
  // effective weekly change implied by the (possibly clamped) intake
  let effectiveWeeklyKg = (dailyAdjustment * 7) / KCAL_PER_KG // negative when losing
  if (direction === 'maintain') effectiveWeeklyKg = 0

  const weeksToGoal =
    direction === 'maintain' || effectiveWeeklyKg === 0
      ? null
      : Math.abs(diff) / Math.abs(effectiveWeeklyKg)

  return { bmr, maintenance, direction, targetCalories: target, dailyAdjustment, effectiveWeeklyKg, clamped, weeksToGoal }
}

export interface MacroSplit {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** Suggested macros: ~1.8 g/kg protein, 25% fat, remainder carbs. */
export function suggestMacros(calories: number, bodyKg: number): MacroSplit {
  const protein = Math.round(1.8 * bodyKg)
  const fat = Math.round((calories * 0.25) / 9)
  const carbCals = Math.max(0, calories - protein * 4 - fat * 9)
  const carbs = Math.round(carbCals / 4)
  return { calories: Math.round(calories), protein, carbs, fat }
}
