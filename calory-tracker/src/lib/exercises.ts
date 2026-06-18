import type { PlannedExercise } from '../types'
import { uid } from './id'

export type ExerciseCategory = 'Push' | 'Pull' | 'Legs' | 'Core' | 'Cardio' | 'Full body'

export const EXERCISE_CATEGORIES: ExerciseCategory[] = ['Push', 'Pull', 'Legs', 'Core', 'Cardio', 'Full body']

export interface CatalogExercise {
  name: string
  category: ExerciseCategory
  sets?: number
  reps?: number
  note?: string
}

/** A browsable library of common exercises grouped by movement category. */
export const EXERCISE_CATALOG: CatalogExercise[] = [
  // Push
  { name: 'Barbell bench press', category: 'Push', sets: 4, reps: 8 },
  { name: 'Incline dumbbell press', category: 'Push', sets: 3, reps: 10 },
  { name: 'Overhead press', category: 'Push', sets: 3, reps: 8 },
  { name: 'Dumbbell shoulder press', category: 'Push', sets: 3, reps: 10 },
  { name: 'Lateral raises', category: 'Push', sets: 3, reps: 15 },
  { name: 'Triceps pushdown', category: 'Push', sets: 3, reps: 12 },
  { name: 'Overhead triceps extension', category: 'Push', sets: 3, reps: 12 },
  { name: 'Dips', category: 'Push', sets: 3, reps: 10 },
  { name: 'Cable chest fly', category: 'Push', sets: 3, reps: 12 },
  { name: 'Push-ups', category: 'Push', sets: 3, reps: 15 },

  // Pull
  { name: 'Deadlift', category: 'Pull', sets: 4, reps: 5 },
  { name: 'Pull-ups', category: 'Pull', sets: 4, reps: 8 },
  { name: 'Lat pulldown', category: 'Pull', sets: 3, reps: 10 },
  { name: 'Barbell row', category: 'Pull', sets: 3, reps: 10 },
  { name: 'Seated cable row', category: 'Pull', sets: 3, reps: 12 },
  { name: 'Face pulls', category: 'Pull', sets: 3, reps: 15 },
  { name: 'Barbell biceps curl', category: 'Pull', sets: 3, reps: 10 },
  { name: 'Dumbbell hammer curl', category: 'Pull', sets: 3, reps: 12 },
  { name: 'Shrugs', category: 'Pull', sets: 3, reps: 15 },

  // Legs
  { name: 'Back squat', category: 'Legs', sets: 5, reps: 5 },
  { name: 'Front squat', category: 'Legs', sets: 4, reps: 6 },
  { name: 'Romanian deadlift', category: 'Legs', sets: 3, reps: 10 },
  { name: 'Leg press', category: 'Legs', sets: 3, reps: 12 },
  { name: 'Walking lunges', category: 'Legs', sets: 3, reps: 12 },
  { name: 'Leg curl', category: 'Legs', sets: 3, reps: 12 },
  { name: 'Leg extension', category: 'Legs', sets: 3, reps: 15 },
  { name: 'Calf raises', category: 'Legs', sets: 4, reps: 15 },
  { name: 'Bulgarian split squat', category: 'Legs', sets: 3, reps: 10 },
  { name: 'Hip thrust', category: 'Legs', sets: 3, reps: 10 },

  // Core
  { name: 'Plank', category: 'Core', sets: 3, note: '45–60s hold' },
  { name: 'Hanging leg raises', category: 'Core', sets: 3, reps: 12 },
  { name: 'Cable crunch', category: 'Core', sets: 3, reps: 15 },
  { name: 'Russian twists', category: 'Core', sets: 3, reps: 20 },
  { name: 'Ab wheel rollout', category: 'Core', sets: 3, reps: 10 },
  { name: 'Bicycle crunches', category: 'Core', sets: 3, reps: 20 },
  { name: 'Mountain climbers', category: 'Core', sets: 3, note: '40s' },
  { name: 'Dead bug', category: 'Core', sets: 3, reps: 12 },

  // Cardio
  { name: 'Treadmill run', category: 'Cardio', note: '20 min steady' },
  { name: 'Rowing intervals', category: 'Cardio', note: '5 × 500m' },
  { name: 'Cycling', category: 'Cardio', note: '20 min' },
  { name: 'Jump rope', category: 'Cardio', sets: 5, note: '60s on / 30s off' },
  { name: 'Burpees', category: 'Cardio', sets: 4, reps: 12 },
  { name: 'Incline walk', category: 'Cardio', note: '15 min' },
  { name: 'Stair climber', category: 'Cardio', note: '12 min' },

  // Full body
  { name: 'Clean & press', category: 'Full body', sets: 4, reps: 6 },
  { name: 'Kettlebell swing', category: 'Full body', sets: 4, reps: 15 },
  { name: 'Thruster', category: 'Full body', sets: 3, reps: 10 },
  { name: 'Turkish get-up', category: 'Full body', sets: 3, reps: 5 },
]

export interface WorkoutTemplate {
  name: string
  icon: string
  activity: string
  met: number
  durationMin: number
  description: string
  exercises: Omit<CatalogExercise, 'category'>[]
}

const pick = (...names: string[]): Omit<CatalogExercise, 'category'>[] =>
  names.map((n) => {
    const found = EXERCISE_CATALOG.find((e) => e.name === n)
    return found
      ? { name: found.name, sets: found.sets, reps: found.reps, note: found.note }
      : { name: n }
  })

/** Ready-made splits the user can start from, then tweak and save. */
export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    name: 'Push Day',
    icon: '💪',
    activity: 'Weight training',
    met: 5,
    durationMin: 60,
    description: 'Chest, shoulders, triceps',
    exercises: pick('Barbell bench press', 'Overhead press', 'Incline dumbbell press', 'Lateral raises', 'Triceps pushdown'),
  },
  {
    name: 'Pull Day',
    icon: '🪝',
    activity: 'Weight training',
    met: 5,
    durationMin: 60,
    description: 'Back, biceps',
    exercises: pick('Deadlift', 'Pull-ups', 'Barbell row', 'Face pulls', 'Barbell biceps curl'),
  },
  {
    name: 'Leg Day',
    icon: '🦵',
    activity: 'Weight training',
    met: 6,
    durationMin: 70,
    description: 'Quads, hamstrings, glutes, calves',
    exercises: pick('Back squat', 'Romanian deadlift', 'Leg press', 'Leg curl', 'Calf raises'),
  },
  {
    name: 'Upper Body',
    icon: '🏋️',
    activity: 'Weight training',
    met: 5,
    durationMin: 60,
    description: 'Push + pull combined',
    exercises: pick('Barbell bench press', 'Barbell row', 'Overhead press', 'Lat pulldown', 'Barbell biceps curl', 'Triceps pushdown'),
  },
  {
    name: 'Lower Body',
    icon: '🦿',
    activity: 'Weight training',
    met: 6,
    durationMin: 60,
    description: 'Legs + posterior chain',
    exercises: pick('Back squat', 'Romanian deadlift', 'Bulgarian split squat', 'Leg curl', 'Calf raises'),
  },
  {
    name: 'Core + Cardio',
    icon: '🔥',
    activity: 'HIIT',
    met: 8,
    durationMin: 40,
    description: 'Abs and conditioning',
    exercises: pick('Plank', 'Hanging leg raises', 'Russian twists', 'Mountain climbers', 'Rowing intervals'),
  },
  {
    name: 'Full Body',
    icon: '⚡',
    activity: 'Weight training',
    met: 6,
    durationMin: 55,
    description: 'One session, everything',
    exercises: pick('Back squat', 'Barbell bench press', 'Barbell row', 'Overhead press', 'Plank'),
  },
]

/** Turn catalog/template exercises into PlannedExercise entries with ids. */
export function toPlanned(list: Omit<CatalogExercise, 'category'>[]): PlannedExercise[] {
  return list.map((e) => ({ id: uid(), name: e.name, sets: e.sets, reps: e.reps, note: e.note }))
}
