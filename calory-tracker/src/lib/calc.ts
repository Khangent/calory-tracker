import type { FoodEntry, Macros, Recipe } from '../types'

export const emptyMacros = (): Macros => ({ calories: 0, protein: 0, carbs: 0, fat: 0 })

export function sumMacros(entries: Macros[]): Macros {
  return entries.reduce<Macros>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein,
      carbs: acc.carbs + e.carbs,
      fat: acc.fat + e.fat,
    }),
    emptyMacros(),
  )
}

export function entriesForDate(entries: FoodEntry[], date: string): FoodEntry[] {
  return entries.filter((e) => e.date === date)
}

export function totalsForDate(entries: FoodEntry[], date: string): Macros {
  return sumMacros(entriesForDate(entries, date))
}

/** Calories from each macro using Atwater factors (4/4/9 kcal per gram). */
export function macroCalories(m: Macros) {
  return {
    protein: m.protein * 4,
    carbs: m.carbs * 4,
    fat: m.fat * 9,
  }
}

export function pct(value: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((value / goal) * 100))
}

export const round = (n: number, digits = 0): number => {
  const f = 10 ** digits
  return Math.round(n * f) / f
}

/** Total macros across all ingredients in a recipe. */
export function recipeTotals(r: Recipe): Macros {
  return sumMacros(r.ingredients)
}

/** Macros for a single serving of a recipe. */
export function perServing(r: Recipe): Macros {
  const total = recipeTotals(r)
  const s = Math.max(1, r.servings)
  return {
    calories: total.calories / s,
    protein: total.protein / s,
    carbs: total.carbs / s,
    fat: total.fat / s,
  }
}

/** Scale macros by a factor (e.g. number of servings to log). */
export function scaleMacros(m: Macros, factor: number): Macros {
  return {
    calories: m.calories * factor,
    protein: m.protein * factor,
    carbs: m.carbs * factor,
    fat: m.fat * factor,
  }
}

/** Clamp + sanitise a numeric form field into a non-negative number. */
export function toNum(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}
