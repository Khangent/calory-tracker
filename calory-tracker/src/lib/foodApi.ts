import type { Macros } from '../types'

/** A normalized food search result. Macros are per 100 g. */
export interface FoodResult {
  id: string
  name: string
  brand?: string
  imageUrl?: string
  per100g: Macros
  /** grams in one serving, if the product declares it */
  servingG?: number
}

/** Which database a search hits. */
export type FoodSource = 'usda' | 'off'

const OFF_SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl'
const FDC_SEARCH_URL = 'https://api.nal.usda.gov/fdc/v1/foods/search'

function num(v: unknown): number {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return Number.isFinite(n) && n > 0 ? n : 0
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** kJ → kcal fallback when an explicit kcal value is missing. */
function kjToKcal(kj: number): number {
  return kj / 4.184
}

function mapProduct(p: any): FoodResult | null {
  const name: string =
    p.product_name || p.product_name_en || p.generic_name || ''
  if (!name.trim()) return null

  const n = p.nutriments ?? {}
  let calories = num(n['energy-kcal_100g'])
  if (!calories) {
    const kj = num(n['energy_100g']) || num(n['energy-kj_100g'])
    if (kj) calories = Math.round(kjToKcal(kj))
  }
  // Skip products with no usable energy data.
  if (!calories) return null

  return {
    id: String(p.code || p._id || name),
    name: name.trim(),
    brand: (p.brands || '').split(',')[0]?.trim() || undefined,
    imageUrl: p.image_small_url || p.image_thumb_url || undefined,
    per100g: {
      calories: Math.round(calories),
      protein: Math.round(num(n['proteins_100g']) * 10) / 10,
      carbs: Math.round(num(n['carbohydrates_100g']) * 10) / 10,
      fat: Math.round(num(n['fat_100g']) * 10) / 10,
    },
    servingG: num(p.serving_quantity) || undefined,
  }
}

/** Open Food Facts — strong for branded/barcoded (often European) packaged products. */
async function searchFoodsOFF(query: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const url = new URL(OFF_SEARCH_URL)
  url.searchParams.set('search_terms', query)
  url.searchParams.set('search_simple', '1')
  url.searchParams.set('action', 'process')
  url.searchParams.set('json', '1')
  url.searchParams.set('page_size', '25')
  url.searchParams.set('sort_by', 'unique_scans_n') // popular first
  url.searchParams.set(
    'fields',
    'code,product_name,product_name_en,generic_name,brands,image_small_url,image_thumb_url,nutriments,serving_quantity',
  )

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) throw new Error(`Search failed (HTTP ${res.status})`)
  const data = await res.json()
  const products: any[] = Array.isArray(data.products) ? data.products : []

  const seen = new Set<string>()
  const out: FoodResult[] = []
  for (const p of products) {
    const mapped = mapProduct(p)
    if (mapped && !seen.has(mapped.id)) {
      seen.add(mapped.id)
      out.push(mapped)
    }
  }
  return out
}

/** Read a per-100g nutrient from a USDA FDC search result by nutrient id / number. */
function fdcNutrient(nutrients: any[], ids: number[], numbers: string[], unit?: string): number {
  for (const n of nutrients) {
    const matchId = ids.includes(n.nutrientId)
    const matchNum = numbers.includes(String(n.nutrientNumber))
    const matchUnit = !unit || String(n.unitName).toUpperCase() === unit
    if ((matchId || matchNum) && matchUnit) return num(n.value)
  }
  return 0
}

function mapFdcFood(f: any): FoodResult | null {
  const name: string = (f.description || '').trim()
  if (!name) return null
  const ns: any[] = Array.isArray(f.foodNutrients) ? f.foodNutrients : []

  let calories = fdcNutrient(ns, [1008], ['208'], 'KCAL')
  if (!calories) {
    const kj = fdcNutrient(ns, [1062, 2047, 2048], ['268'], 'KJ')
    if (kj) calories = Math.round(kjToKcal(kj))
  }
  if (!calories) return null

  return {
    id: 'fdc-' + String(f.fdcId ?? name),
    // SR/Foundation descriptions are nicely cased; branded are ALL-CAPS — soften those.
    name: name === name.toUpperCase() ? toTitleCase(name) : name,
    brand: (f.brandName || f.brandOwner || '').trim() || undefined,
    per100g: {
      calories: Math.round(calories),
      protein: round1(fdcNutrient(ns, [1003], ['203'])),
      carbs: round1(fdcNutrient(ns, [1005], ['205'])),
      fat: round1(fdcNutrient(ns, [1004], ['204'])),
    },
    servingG:
      f.servingSize && String(f.servingSizeUnit).toLowerCase() === 'g' ? num(f.servingSize) || undefined : undefined,
  }
}

function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** USDA FoodData Central — authoritative, precise values, especially for whole/generic foods. */
async function searchFoodsUSDA(query: string, apiKey: string, signal?: AbortSignal): Promise<FoodResult[]> {
  const url = new URL(FDC_SEARCH_URL)
  url.searchParams.set('api_key', apiKey || 'DEMO_KEY')
  url.searchParams.set('query', query)
  url.searchParams.set('pageSize', '25')
  // whole-food datasets first, then branded
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS),Branded')

  const res = await fetch(url.toString(), { signal })
  if (!res.ok) {
    if (res.status === 429) throw new Error('USDA rate limit reached — add your free API key in Settings → Food database.')
    if (res.status === 403) throw new Error('USDA API key rejected — check it in Settings → Food database.')
    throw new Error(`Search failed (HTTP ${res.status})`)
  }
  const data = await res.json()
  const foods: any[] = Array.isArray(data.foods) ? data.foods : []

  const seen = new Set<string>()
  const out: FoodResult[] = []
  for (const f of foods) {
    const mapped = mapFdcFood(f)
    if (mapped && !seen.has(mapped.id)) {
      seen.add(mapped.id)
      out.push(mapped)
    }
  }
  return out
}

/**
 * Search a food database. Runs in the user's browser (both sources are CORS-enabled).
 * USDA gives precise values for whole foods; Open Food Facts is best for packaged products.
 */
export async function searchFoods(
  source: FoodSource,
  query: string,
  opts: { usdaKey?: string; signal?: AbortSignal } = {},
): Promise<FoodResult[]> {
  const q = query.trim()
  if (q.length < 2) return []
  return source === 'usda'
    ? searchFoodsUSDA(q, opts.usdaKey ?? 'DEMO_KEY', opts.signal)
    : searchFoodsOFF(q, opts.signal)
}

/** Scale per-100g macros to an arbitrary gram amount, rounded for display. */
export function macrosForGrams(per100g: Macros, grams: number): Macros {
  const f = grams / 100
  return {
    calories: Math.round(per100g.calories * f),
    protein: Math.round(per100g.protein * f * 10) / 10,
    carbs: Math.round(per100g.carbs * f * 10) / 10,
    fat: Math.round(per100g.fat * f * 10) / 10,
  }
}
