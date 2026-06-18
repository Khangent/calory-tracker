export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEALS: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snack', label: 'Snacks', icon: '🍎' },
]

export interface Macros {
  calories: number
  protein: number
  carbs: number
  fat: number
}

/** A logged food on a given day. */
export interface FoodEntry extends Macros {
  id: string
  date: string // YYYY-MM-DD
  name: string
  meal: MealType
  createdAt: number
}

/** A reusable food the user can quickly re-log. Macros are per single serving. */
export interface SavedFood extends Macros {
  id: string
  name: string
}

export interface WeightEntry {
  id: string
  date: string // YYYY-MM-DD
  weight: number
  createdAt: number
}

/** One ingredient inside a recipe. Macros are the totals for the amount used. */
export interface RecipeIngredient extends Macros {
  id: string
  name: string
}

/** A saved meal/recipe the user makes often. */
export interface Recipe {
  id: string
  name: string
  servings: number
  ingredients: RecipeIngredient[]
  createdAt: number
}

/** A workout the user actually performed on a given day. */
export interface WorkoutEntry {
  id: string
  date: string // YYYY-MM-DD
  activity: string
  met: number
  minutes: number
  calories: number // estimated burn (editable)
  createdAt: number
}

/** A single exercise inside a planned routine. */
export interface PlannedExercise {
  id: string
  name: string
  sets?: number
  reps?: number
  note?: string
}

/** A reusable workout routine, optionally scheduled to a weekday. */
export interface Routine {
  id: string
  name: string
  /** 0 (Sun) – 6 (Sat), or null when unscheduled. */
  day: number | null
  activity: string
  met: number
  durationMin: number
  exercises: PlannedExercise[]
  createdAt: number
}

export type WeightUnit = 'kg' | 'lb'

export type Sex = 'male' | 'female'

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'athlete'

export interface Goals extends Macros {}

export interface Settings {
  name: string
  goals: Goals
  startWeight: number
  targetWeight: number
  unit: WeightUnit
  /** When true, calories burned in workouts are added to the daily calorie budget. */
  addExerciseToBudget: boolean
  // profile — used by the goal/calorie planner
  heightCm: number
  age: number
  sex: Sex
  activityLevel: ActivityLevel
  /** Target rate of weight change, kg per week (magnitude). */
  weeklyRateKg: number
  /** Daily step goal. */
  stepGoal: number
  /** Optional personal USDA FoodData Central API key (falls back to a shared demo key). */
  usdaApiKey: string
}
