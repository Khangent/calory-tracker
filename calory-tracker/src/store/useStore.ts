import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  FoodEntry,
  SavedFood,
  Settings,
  WeightEntry,
  MealType,
  Macros,
  Recipe,
  RecipeIngredient,
  WorkoutEntry,
  Routine,
  PlannedExercise,
} from '../types'
import { uid } from '../lib/id'
import { todayKey, addDaysKey } from '../lib/date'
import { perServing, scaleMacros, round } from '../lib/calc'
import { DEFAULT_BASE_URL, type AIConfig } from '../lib/ai'
import { ACTIVITIES, estimateBurn } from '../lib/fitness'

interface State {
  foods: FoodEntry[]
  savedFoods: SavedFood[]
  recipes: Recipe[]
  weights: WeightEntry[]
  workouts: WorkoutEntry[]
  routines: Routine[]
  /** Daily step counts keyed by YYYY-MM-DD. */
  steps: Record<string, number>
  settings: Settings
  ai: AIConfig
  hydrated: boolean
  /** true once demo data has been auto-loaded (or the user cleared it) */
  seeded: boolean

  // food actions
  addFood: (input: Omit<FoodEntry, 'id' | 'createdAt'>) => void
  updateFood: (id: string, patch: Partial<FoodEntry>) => void
  removeFood: (id: string) => void
  logSavedFood: (food: SavedFood, date: string, meal: MealType) => void

  // saved foods
  addSavedFood: (input: Omit<SavedFood, 'id'>) => SavedFood
  removeSavedFood: (id: string) => void

  // recipes
  addRecipe: (input: Omit<Recipe, 'id' | 'createdAt'>) => Recipe
  updateRecipe: (id: string, patch: Partial<Omit<Recipe, 'id' | 'createdAt'>>) => void
  removeRecipe: (id: string) => void
  /** Log `servings` of a recipe to the food log as a single entry. */
  logRecipe: (recipe: Recipe, date: string, meal: MealType, servings: number) => void

  // weight actions
  addWeight: (date: string, weight: number) => void
  removeWeight: (id: string) => void

  // fitness — workouts
  addWorkout: (input: Omit<WorkoutEntry, 'id' | 'createdAt'>) => void
  updateWorkout: (id: string, patch: Partial<WorkoutEntry>) => void
  removeWorkout: (id: string) => void

  // fitness — routines (workout plan)
  addRoutine: (input: Omit<Routine, 'id' | 'createdAt'>) => Routine
  updateRoutine: (id: string, patch: Partial<Omit<Routine, 'id' | 'createdAt'>>) => void
  removeRoutine: (id: string) => void
  /** Log a routine as a completed workout on the given date. */
  logRoutine: (routine: Routine, date: string, calories: number) => void

  // fitness — steps
  setSteps: (date: string, count: number) => void

  // settings
  updateSettings: (patch: Partial<Settings>) => void
  updateGoals: (patch: Partial<Macros>) => void
  updateAI: (patch: Partial<AIConfig>) => void

  resetAll: () => void
  loadDemoData: () => void
}

const defaultSettings: Settings = {
  name: '',
  goals: { calories: 2200, protein: 150, carbs: 220, fat: 70 },
  startWeight: 80,
  targetWeight: 75,
  unit: 'kg',
  addExerciseToBudget: true,
  heightCm: 178,
  age: 30,
  sex: 'male',
  activityLevel: 'moderate',
  weeklyRateKg: 0.5,
  stepGoal: 10000,
  usdaApiKey: '',
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      foods: [],
      savedFoods: starterSavedFoods(),
      recipes: starterRecipes(),
      weights: [],
      workouts: [],
      routines: starterRoutines(),
      steps: {},
      settings: defaultSettings,
      ai: { apiKey: '', baseUrl: DEFAULT_BASE_URL, model: '' },
      hydrated: false,
      seeded: false,

      addFood: (input) =>
        set((s) => ({
          foods: [...s.foods, { ...input, id: uid(), createdAt: Date.now() }],
        })),

      updateFood: (id, patch) =>
        set((s) => ({
          foods: s.foods.map((f) => (f.id === id ? { ...f, ...patch } : f)),
        })),

      removeFood: (id) => set((s) => ({ foods: s.foods.filter((f) => f.id !== id) })),

      logSavedFood: (food, date, meal) =>
        set((s) => ({
          foods: [
            ...s.foods,
            {
              id: uid(),
              createdAt: Date.now(),
              date,
              meal,
              name: food.name,
              calories: food.calories,
              protein: food.protein,
              carbs: food.carbs,
              fat: food.fat,
            },
          ],
        })),

      addSavedFood: (input) => {
        const food: SavedFood = { ...input, id: uid() }
        set((s) => ({ savedFoods: [food, ...s.savedFoods] }))
        return food
      },

      removeSavedFood: (id) =>
        set((s) => ({ savedFoods: s.savedFoods.filter((f) => f.id !== id) })),

      addRecipe: (input) => {
        const recipe: Recipe = { ...input, id: uid(), createdAt: Date.now() }
        set((s) => ({ recipes: [recipe, ...s.recipes] }))
        return recipe
      },

      updateRecipe: (id, patch) =>
        set((s) => ({
          recipes: s.recipes.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      removeRecipe: (id) =>
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) })),

      logRecipe: (recipe, date, meal, servings) => {
        const each = perServing(recipe)
        const m = scaleMacros(each, servings)
        const macros = {
          calories: round(m.calories),
          protein: round(m.protein, 1),
          carbs: round(m.carbs, 1),
          fat: round(m.fat, 1),
        }
        const name = servings === 1 ? recipe.name : `${recipe.name} ×${round(servings, 2)}`
        set((s) => ({
          foods: [
            ...s.foods,
            { id: uid(), createdAt: Date.now(), date, meal, name, ...macros },
          ],
        }))
      },

      addWeight: (date, weight) =>
        set((s) => {
          const existing = s.weights.find((w) => w.date === date)
          if (existing) {
            return {
              weights: s.weights.map((w) =>
                w.date === date ? { ...w, weight } : w,
              ),
            }
          }
          return {
            weights: [
              ...s.weights,
              { id: uid(), date, weight, createdAt: Date.now() },
            ],
          }
        }),

      removeWeight: (id) =>
        set((s) => ({ weights: s.weights.filter((w) => w.id !== id) })),

      addWorkout: (input) =>
        set((s) => ({
          workouts: [...s.workouts, { ...input, id: uid(), createdAt: Date.now() }],
        })),

      updateWorkout: (id, patch) =>
        set((s) => ({
          workouts: s.workouts.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),

      removeWorkout: (id) =>
        set((s) => ({ workouts: s.workouts.filter((w) => w.id !== id) })),

      addRoutine: (input) => {
        const routine: Routine = { ...input, id: uid(), createdAt: Date.now() }
        set((s) => ({ routines: [routine, ...s.routines] }))
        return routine
      },

      updateRoutine: (id, patch) =>
        set((s) => ({
          routines: s.routines.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      removeRoutine: (id) =>
        set((s) => ({ routines: s.routines.filter((r) => r.id !== id) })),

      logRoutine: (routine, date, calories) =>
        set((s) => ({
          workouts: [
            ...s.workouts,
            {
              id: uid(),
              createdAt: Date.now(),
              date,
              activity: routine.name,
              met: routine.met,
              minutes: routine.durationMin,
              calories,
            },
          ],
        })),

      setSteps: (date, count) =>
        set((s) => {
          const next = { ...s.steps }
          if (count > 0) next[date] = Math.round(count)
          else delete next[date]
          return { steps: next }
        }),

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      updateGoals: (patch) =>
        set((s) => ({ settings: { ...s.settings, goals: { ...s.settings.goals, ...patch } } })),

      updateAI: (patch) => set((s) => ({ ai: { ...s.ai, ...patch } })),

      resetAll: () =>
        set({
          foods: [],
          weights: [],
          workouts: [],
          steps: {},
          savedFoods: starterSavedFoods(),
          recipes: starterRecipes(),
          routines: starterRoutines(),
          settings: defaultSettings,
          seeded: true, // stay empty — don't auto-reseed after an explicit reset
        }),

      loadDemoData: () => {
        const { foods, weights, workouts, steps } = buildDemoData(get().savedFoods)
        set({ foods, weights, workouts, steps, seeded: true })
      },
    }),
    {
      name: 'calory-tracker:v1',
      partialize: ({ foods, savedFoods, recipes, weights, workouts, routines, steps, settings, ai, seeded }) => ({
        foods,
        savedFoods,
        recipes,
        weights,
        workouts,
        routines,
        steps,
        settings,
        ai,
        seeded,
      }),
      // Deep-merge persisted state onto current defaults so fields added in newer versions
      // (e.g. settings.stepGoal) keep their defaults instead of becoming undefined.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<State>
        return {
          ...current,
          ...p,
          settings: { ...current.settings, ...(p.settings ?? {}) },
          ai: { ...current.ai, ...(p.ai ?? {}) },
          steps: p.steps ?? current.steps,
        }
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return
        state.hydrated = true
        // First-ever launch: populate sample data so charts aren't empty.
        if (!state.seeded && state.foods.length === 0) {
          state.loadDemoData()
        }
      },
    },
  ),
)

function starterSavedFoods(): SavedFood[] {
  const list: Omit<SavedFood, 'id'>[] = [
    { name: 'Oatmeal (1 cup)', calories: 307, protein: 11, carbs: 55, fat: 5 },
    { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
    { name: 'Grilled Chicken (150g)', calories: 248, protein: 47, carbs: 0, fat: 5 },
    { name: 'Greek Yogurt (170g)', calories: 100, protein: 17, carbs: 6, fat: 1 },
    { name: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fat: 2 },
    { name: 'Egg (large)', calories: 72, protein: 6, carbs: 0, fat: 5 },
    { name: 'Almonds (28g)', calories: 164, protein: 6, carbs: 6, fat: 14 },
    { name: 'Protein Shake', calories: 160, protein: 30, carbs: 5, fat: 2 },
  ]
  return list.map((f) => ({ ...f, id: uid() }))
}

function starterRecipes(): Recipe[] {
  const ing = (
    name: string,
    calories: number,
    protein: number,
    carbs: number,
    fat: number,
  ): RecipeIngredient => ({ id: uid(), name, calories, protein, carbs, fat })

  return [
    {
      id: uid(),
      createdAt: Date.now(),
      name: 'Chicken & Rice Bowl',
      servings: 2,
      ingredients: [
        ing('Grilled chicken breast (300g)', 495, 93, 0, 11),
        ing('Brown rice (2 cups cooked)', 432, 10, 90, 4),
        ing('Mixed veg (200g)', 80, 4, 14, 1),
        ing('Olive oil (1 tbsp)', 119, 0, 0, 14),
      ],
    },
    {
      id: uid(),
      createdAt: Date.now(),
      name: 'Protein Oats',
      servings: 1,
      ingredients: [
        ing('Oats (60g)', 228, 8, 41, 4),
        ing('Protein powder (1 scoop)', 120, 24, 3, 1),
        ing('Banana', 105, 1, 27, 0),
        ing('Peanut butter (1 tbsp)', 94, 4, 3, 8),
      ],
    },
  ]
}

function buildDemoData(saved: SavedFood[]) {
  const foods: FoodEntry[] = []
  const weights: WeightEntry[] = []
  const workouts: WorkoutEntry[] = []
  const steps: Record<string, number> = {}
  const meals: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
  // workout activities to cycle through (skip "Other")
  const acts = ACTIVITIES.filter((a) => a.name !== 'Other')

  for (let i = 29; i >= 0; i--) {
    const date = addDaysKey(todayKey(), -i)
    // 3-5 entries per day, drawn from saved foods
    const count = 3 + (i % 3)
    for (let j = 0; j < count; j++) {
      const f = saved[(i + j) % saved.length]
      foods.push({
        id: uid(),
        createdAt: Date.now() - i * 86400000,
        date,
        meal: meals[j % meals.length],
        name: f.name,
        calories: f.calories,
        protein: f.protein,
        carbs: f.carbs,
        fat: f.fat,
      })
    }
    // weight trends gently downward with a little noise every ~2 days
    if (i % 2 === 0) {
      const drift = 80 - (29 - i) * 0.12
      const noise = ((i * 37) % 7) / 10 - 0.3
      weights.push({
        id: uid(),
        createdAt: Date.now() - i * 86400000,
        date,
        weight: Math.round((drift + noise) * 10) / 10,
      })
    }
    // a workout roughly every other day, ~78kg reference
    if (i % 2 === 1 || i % 5 === 0) {
      const a = acts[i % acts.length]
      const minutes = 30 + (i % 4) * 15
      workouts.push({
        id: uid(),
        createdAt: Date.now() - i * 86400000,
        date,
        activity: a.name,
        met: a.met,
        minutes,
        calories: estimateBurn(a.met, minutes, 78),
      })
    }
    // daily steps, varying 5k–13k
    steps[date] = 5000 + ((i * 911) % 8000)
  }
  return { foods, weights, workouts, steps }
}

function starterRoutines(): Routine[] {
  const ex = (name: string, sets?: number, reps?: number): PlannedExercise => ({
    id: uid(),
    name,
    sets,
    reps,
  })
  return [
    {
      id: uid(),
      createdAt: Date.now(),
      name: 'Push Day',
      day: 1,
      activity: 'Weight training',
      met: 5,
      durationMin: 60,
      exercises: [
        ex('Bench press', 4, 8),
        ex('Overhead press', 3, 10),
        ex('Incline dumbbell press', 3, 12),
        ex('Triceps pushdown', 3, 15),
      ],
    },
    {
      id: uid(),
      createdAt: Date.now(),
      name: 'Pull Day',
      day: 3,
      activity: 'Weight training',
      met: 5,
      durationMin: 60,
      exercises: [
        ex('Deadlift', 4, 5),
        ex('Pull-ups', 4, 8),
        ex('Barbell row', 3, 10),
        ex('Biceps curl', 3, 12),
      ],
    },
    {
      id: uid(),
      createdAt: Date.now(),
      name: 'Leg Day',
      day: 5,
      activity: 'Weight training',
      met: 6,
      durationMin: 70,
      exercises: [ex('Squat', 5, 5), ex('Romanian deadlift', 3, 10), ex('Leg press', 3, 12), ex('Calf raises', 4, 15)],
    },
    {
      id: uid(),
      createdAt: Date.now(),
      name: 'Easy Run',
      day: 6,
      activity: 'Running',
      met: 9.8,
      durationMin: 35,
      exercises: [ex('5–6 km steady pace')],
    },
  ]
}
