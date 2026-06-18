import type { MealType } from '../types'
import { ACTIVITIES } from './fitness'

export interface AIConfig {
  apiKey: string
  baseUrl: string
  model: string
}

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ContentPart[]
}

export const DEFAULT_BASE_URL = 'https://aikeys.maibornwolff.de'

export function aiConfigured(c: AIConfig): boolean {
  return Boolean(c.apiKey && c.model && c.baseUrl)
}

/** Normalize a base URL to the host root (strips trailing slash and a trailing /v1). */
function apiBase(base: string): string {
  return base.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
}

async function toError(res: Response): Promise<Error> {
  let msg = `Request failed (HTTP ${res.status})`
  try {
    const j = await res.json()
    msg = j?.error?.message || j?.message || j?.detail || msg
  } catch {
    /* ignore */
  }
  if (res.status === 401) msg = 'Invalid or missing API key — check Settings → AI.'
  if (res.status === 404) msg = `Model "${msg}" not found. Pick a different model in Settings → AI.`
  return new Error(msg)
}

/** Low-level chat call. Returns the assistant message text. */
export async function chat(
  config: AIConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const res = await fetch(`${apiBase(config.baseUrl)}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: opts.temperature ?? 0.4,
    }),
    signal: opts.signal,
  })
  if (!res.ok) throw await toError(res)
  const data = await res.json()
  return data?.choices?.[0]?.message?.content ?? ''
}

/** List model ids available on the proxy for the given key. */
export async function listModels(config: Pick<AIConfig, 'apiKey' | 'baseUrl'>): Promise<string[]> {
  const res = await fetch(`${apiBase(config.baseUrl)}/v1/models`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  })
  if (!res.ok) throw await toError(res)
  const data = await res.json()
  const ids: string[] = (data?.data ?? []).map((m: any) => m.id).filter(Boolean)
  return [...new Set(ids)].sort((a, b) => a.localeCompare(b))
}

/** Extract the first balanced JSON object/array from a model response (handles code fences + prose). */
export function extractJson(text: string): string {
  let t = text.trim()
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) t = fence[1].trim()
  const start = t.search(/[{[]/)
  if (start === -1) return t
  const open = t[start]
  const close = open === '{' ? '}' : ']'
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < t.length; i++) {
    const c = t[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === open) depth++
    else if (c === close) {
      depth--
      if (depth === 0) return t.slice(start, i + 1)
    }
  }
  return t.slice(start)
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 10) / 10 : 0
}

const MEAL_SET: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']
function asMeal(v: unknown, fallback: MealType = 'snack'): MealType {
  const s = String(v ?? '').toLowerCase()
  return (MEAL_SET.find((m) => s.includes(m)) ?? fallback) as MealType
}

// ---------------------------------------------------------------------------
// Feature: natural-language food logging
// ---------------------------------------------------------------------------

export interface ParsedFoodItem {
  name: string
  meal: MealType
  calories: number
  protein: number
  carbs: number
  fat: number
}

function foodSystemPrompt(defaultMeal: MealType, fromPhoto: boolean): string {
  const source = fromPhoto
    ? 'The user sends a photo of a meal. Identify the foods you can see and estimate portion sizes from visual cues (plate/utensil size). '
    : 'The user describes what they ate in free text. '
  return (
    'You are a precise nutrition assistant. ' +
    source +
    'Break it into individual food items and estimate nutrition for the TOTAL amount eaten (not per 100g). ' +
    'Calories are kcal; protein, carbs and fat are grams. Use realistic, commonly-cited values. ' +
    `If the meal is unclear, default to "${defaultMeal}". ` +
    'Respond with ONLY valid JSON, no prose, in this exact shape: ' +
    '{"items":[{"name":string,"meal":"breakfast"|"lunch"|"dinner"|"snack","calories":number,"protein":number,"carbs":number,"fat":number}]}'
  )
}

function parseFoodItems(content: string, defaultMeal: MealType): ParsedFoodItem[] {
  const parsed = JSON.parse(extractJson(content))
  const items = Array.isArray(parsed?.items) ? parsed.items : []
  return items
    .map((it: any): ParsedFoodItem => ({
      name: String(it?.name ?? '').trim() || 'Food',
      meal: asMeal(it?.meal, defaultMeal),
      calories: num(it?.calories),
      protein: num(it?.protein),
      carbs: num(it?.carbs),
      fat: num(it?.fat),
    }))
    .filter((it: ParsedFoodItem) => it.calories > 0)
}

export async function parseFoodText(
  config: AIConfig,
  text: string,
  defaultMeal: MealType,
  signal?: AbortSignal,
): Promise<ParsedFoodItem[]> {
  const content = await chat(
    config,
    [
      { role: 'system', content: foodSystemPrompt(defaultMeal, false) },
      { role: 'user', content: text },
    ],
    { temperature: 0.2, signal },
  )
  return parseFoodItems(content, defaultMeal)
}

/** Estimate foods + macros from a meal photo (data URL). Requires a vision-capable model. */
export async function estimateFoodFromImage(
  config: AIConfig,
  imageDataUrl: string,
  note: string,
  defaultMeal: MealType,
  signal?: AbortSignal,
): Promise<ParsedFoodItem[]> {
  const userText = note.trim()
    ? `Estimate the foods and nutrition in this meal photo. Extra context from me: ${note.trim()}`
    : 'Estimate the foods and nutrition in this meal photo.'
  const content = await chat(
    config,
    [
      { role: 'system', content: foodSystemPrompt(defaultMeal, true) },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: imageDataUrl } },
        ],
      },
    ],
    { temperature: 0.2, signal },
  )
  return parseFoodItems(content, defaultMeal)
}

// ---------------------------------------------------------------------------
// Feature: AI recipe generator
// ---------------------------------------------------------------------------

export interface GeneratedIngredient {
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
}
export interface GeneratedRecipe {
  name: string
  servings: number
  ingredients: GeneratedIngredient[]
}

export async function generateRecipe(
  config: AIConfig,
  prompt: string,
  signal?: AbortSignal,
): Promise<GeneratedRecipe> {
  const system =
    'You are a chef and nutritionist. Create a single recipe matching the user request. ' +
    'For each ingredient, give nutrition for the AMOUNT used in the whole recipe (totals, not per 100g). ' +
    'Calories are kcal; protein, carbs, fat are grams. Include the amount in each ingredient name (e.g. "Chicken breast (300g)"). ' +
    'Respond with ONLY valid JSON, no prose, in this exact shape: ' +
    '{"name":string,"servings":number,"ingredients":[{"name":string,"calories":number,"protein":number,"carbs":number,"fat":number}]}'
  const content = await chat(
    config,
    [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.6, signal },
  )
  const r = JSON.parse(extractJson(content))
  return {
    name: String(r?.name ?? '').trim() || 'AI Recipe',
    servings: Math.max(1, Math.round(num(r?.servings)) || 1),
    ingredients: (Array.isArray(r?.ingredients) ? r.ingredients : [])
      .map((it: any): GeneratedIngredient => ({
        name: String(it?.name ?? '').trim() || 'Ingredient',
        calories: num(it?.calories),
        protein: num(it?.protein),
        carbs: num(it?.carbs),
        fat: num(it?.fat),
      }))
      .filter((it: GeneratedIngredient) => it.name && it.calories > 0),
  }
}

// ---------------------------------------------------------------------------
// Feature: AI workout generator
// ---------------------------------------------------------------------------

export interface GeneratedExercise {
  name: string
  sets?: number
  reps?: number
  note?: string
}
export interface GeneratedWorkout {
  name: string
  activity: string
  met: number
  durationMin: number
  exercises: GeneratedExercise[]
}

function optNum(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined
}

export async function generateWorkout(
  config: AIConfig,
  prompt: string,
  signal?: AbortSignal,
): Promise<GeneratedWorkout> {
  const activityNames = ACTIVITIES.map((a) => a.name).join(', ')
  const system =
    'You are an experienced strength & conditioning coach. Create ONE workout routine matching the user request. ' +
    `Pick the closest "activity" from this list for calorie estimation: ${activityNames}. ` +
    'Give a realistic total "durationMin" (minutes) and a MET intensity value between 1 and 15. ' +
    'List 4–8 exercises. For lifting use numeric "sets" and "reps"; for timed/cardio movements use a short "note" (e.g. "30s on / 30s off") instead of reps. ' +
    'Respond with ONLY valid JSON, no prose, in this exact shape: ' +
    '{"name":string,"activity":string,"met":number,"durationMin":number,"exercises":[{"name":string,"sets":number,"reps":number,"note":string}]}'
  const content = await chat(
    config,
    [
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.5, signal },
  )
  const w = JSON.parse(extractJson(content))

  // normalize activity + met against our known list
  const wantedActivity = String(w?.activity ?? '').toLowerCase()
  const matched = ACTIVITIES.find(
    (a) => a.name.toLowerCase() === wantedActivity || wantedActivity.includes(a.name.toLowerCase()),
  )
  const met = matched?.met ?? Math.min(15, Math.max(1, num(w?.met) || 5))

  return {
    name: String(w?.name ?? '').trim() || 'AI Workout',
    activity: matched?.name ?? 'Weight training',
    met,
    durationMin: Math.max(5, Math.round(num(w?.durationMin)) || 45),
    exercises: (Array.isArray(w?.exercises) ? w.exercises : [])
      .map((e: any): GeneratedExercise => ({
        name: String(e?.name ?? '').trim(),
        sets: optNum(e?.sets),
        reps: optNum(e?.reps),
        note: e?.note ? String(e.note).trim() : undefined,
      }))
      .filter((e: GeneratedExercise) => e.name),
  }
}

// ---------------------------------------------------------------------------
// Feature: AI nutrition coach / insights
// ---------------------------------------------------------------------------

export async function getInsights(
  config: AIConfig,
  summary: string,
  signal?: AbortSignal,
): Promise<string> {
  const system =
    'You are a supportive, evidence-based nutrition and fitness coach. ' +
    'Given the user\'s recent tracking data, give a short, encouraging analysis: ' +
    'note 1-2 positive patterns, 1-2 things to improve, and 1 concrete actionable tip. ' +
    'Be specific to the numbers. Keep it under 160 words. Use short markdown bullet points and a friendly tone. ' +
    'Do not give medical advice or mention you are an AI.'
  return chat(
    config,
    [
      { role: 'system', content: system },
      { role: 'user', content: summary },
    ],
    { temperature: 0.5, signal },
  )
}
