import type { WorkoutEntry, WeightUnit, Settings, WeightEntry } from '../types'

export interface Activity {
  name: string
  met: number
  icon: string
}

/** Common activities with approximate MET values (Compendium of Physical Activities). */
export const ACTIVITIES: Activity[] = [
  { name: 'Running', met: 9.8, icon: '🏃' },
  { name: 'Walking', met: 3.5, icon: '🚶' },
  { name: 'Cycling', met: 7.5, icon: '🚴' },
  { name: 'Weight training', met: 5.0, icon: '🏋️' },
  { name: 'HIIT', met: 8.0, icon: '🔥' },
  { name: 'Swimming', met: 7.0, icon: '🏊' },
  { name: 'Rowing', met: 7.0, icon: '🚣' },
  { name: 'Elliptical', met: 5.0, icon: '🌀' },
  { name: 'Yoga', met: 2.5, icon: '🧘' },
  { name: 'Hiking', met: 6.0, icon: '🥾' },
  { name: 'Football', met: 7.0, icon: '⚽' },
  { name: 'Basketball', met: 6.5, icon: '🏀' },
  { name: 'Jump rope', met: 11.0, icon: '🪢' },
  { name: 'Pilates', met: 3.0, icon: '🤸' },
  { name: 'Other', met: 5.0, icon: '💪' },
]

const LB_TO_KG = 0.453592

export function toKg(weight: number, unit: WeightUnit): number {
  return unit === 'lb' ? weight * LB_TO_KG : weight
}

/** Best estimate of current body weight in kg (latest weigh-in, else start weight). */
export function bodyWeightKg(weights: WeightEntry[], settings: Settings): number {
  const latest = [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
  const w = latest?.weight ?? settings.startWeight
  return toKg(w, settings.unit)
}

/**
 * NET calories burned by a workout, using the ACSM metabolic equation
 * (kcal/min = MET × 3.5 × kg / 200) minus the ~1 MET you'd burn at rest anyway.
 * Net is the right figure to add back to a daily calorie budget — it avoids
 * double-counting the resting metabolism already covered by your goal/TDEE.
 */
export function estimateBurn(met: number, minutes: number, weightKg: number): number {
  const netMet = Math.max(0, met - 1)
  return Math.round((netMet * 3.5 * weightKg) / 200 * minutes)
}

/**
 * NET calories burned from a step count, scaled by body weight.
 * Walking is ~0.04 kcal/step/70 kg gross; subtracting resting metabolism leaves
 * ≈ 0.0004 kcal per step per kg net, i.e. ~280 kcal per 10k steps at 70 kg
 * (~320 at 80 kg) — within the commonly-cited 280–520 range, on the realistic side.
 */
export const KCAL_PER_STEP_PER_KG = 0.0004
export function kcalFromSteps(steps: number, weightKg: number): number {
  if (steps <= 0) return 0
  return Math.round(steps * weightKg * KCAL_PER_STEP_PER_KG)
}

export function workoutsForDate(workouts: WorkoutEntry[], date: string): WorkoutEntry[] {
  return workouts.filter((w) => w.date === date)
}

export function caloriesBurnedForDate(workouts: WorkoutEntry[], date: string): number {
  return workoutsForDate(workouts, date).reduce((sum, w) => sum + w.calories, 0)
}

export const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Weekday index (0=Sun..6=Sat) for a YYYY-MM-DD key, using local time. */
export function weekdayOf(dateKey: string): number {
  return new Date(dateKey + 'T00:00:00').getDay()
}
