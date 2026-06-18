import { useEffect, useRef, useState } from 'react'
import { Search, Loader2, Plus, ArrowLeft, AlertCircle, Save } from 'lucide-react'
import type { MealType, Macros } from '../types'
import { MEALS } from '../types'
import { useStore } from '../store/useStore'
import { useDebounce } from '../lib/useDebounce'
import { searchFoods, macrosForGrams, type FoodResult, type FoodSource } from '../lib/foodApi'
import { round } from '../lib/calc'

interface FoodSearchProps {
  date?: string
  defaultMeal?: MealType
  onAdded?: () => void
  /** When provided, acts as an ingredient picker: returns the macros instead of logging. */
  onPick?: (name: string, macros: Macros) => void
  pickLabel?: string
}

export function FoodSearch({
  date,
  defaultMeal = 'breakfast',
  onAdded,
  onPick,
  pickLabel = 'Add ingredient',
}: FoodSearchProps) {
  const addFood = useStore((s) => s.addFood)
  const addSavedFood = useStore((s) => s.addSavedFood)
  const usdaKey = useStore((s) => s.settings.usdaApiKey)
  const pickMode = Boolean(onPick)

  const [source, setSource] = useState<FoodSource>('usda')
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 400)
  const [results, setResults] = useState<FoodResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FoodResult | null>(null)

  // portion editor state (only used once a product is selected)
  const [grams, setGrams] = useState('100')
  const [meal, setMeal] = useState<MealType>(defaultMeal)
  const [alsoSave, setAlsoSave] = useState(false)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const q = debounced.trim()
    if (q.length < 2) {
      setResults([])
      setError(null)
      setLoading(false)
      return
    }
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    setError(null)
    searchFoods(source, q, { usdaKey, signal: ctrl.signal })
      .then((r) => {
        setResults(r)
        if (r.length === 0) setError('No matches — try a simpler term.')
      })
      .catch((e) => {
        if (e?.name === 'AbortError') return
        setError(e?.message || 'Could not reach the food database. Check your connection and try again.')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false)
      })
    return () => ctrl.abort()
  }, [debounced, source, usdaKey])

  function selectFood(f: FoodResult) {
    setSelected(f)
    setGrams(f.servingG ? String(round(f.servingG)) : '100')
    setMeal(defaultMeal)
    setAlsoSave(false)
  }

  if (selected) {
    const g = parseFloat(grams) || 0
    const macros = macrosForGrams(selected.per100g, g)
    const valid = g > 0
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition"
        >
          <ArrowLeft size={14} /> Back to results
        </button>

        <div className="flex items-center gap-3">
          {selected.imageUrl ? (
            <img
              src={selected.imageUrl}
              alt=""
              className="h-12 w-12 rounded-lg object-cover bg-surface border border-border"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg grid place-items-center bg-surface border border-border text-brand-soft">
              <Search size={18} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{selected.name}</div>
            {selected.brand && <div className="text-[11px] text-muted truncate">{selected.brand}</div>}
            <div className="text-[11px] text-muted tabular-nums">
              {selected.per100g.calories} kcal · {selected.per100g.protein}P / {selected.per100g.carbs}C /{' '}
              {selected.per100g.fat}F per 100 g
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <div>
            <label className="label">Amount (g)</label>
            <input
              className="input tabular-nums"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={grams}
              onChange={(e) => setGrams(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5">
            {[50, 100, 150, 200].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setGrams(String(p))}
                className={`chip flex-1 justify-center ${Number(grams) === p ? 'chip-active' : ''}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {!pickMode && (
          <div>
            <label className="label">Meal</label>
            <div className="flex flex-wrap gap-2">
              {MEALS.map((m) => (
                <button
                  type="button"
                  key={m.key}
                  onClick={() => setMeal(m.key)}
                  className={`chip ${meal === m.key ? 'chip-active' : ''}`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-surface border border-border p-3 grid grid-cols-4 gap-2 text-center">
          <Stat label="kcal" value={macros.calories} color="#22c55e" />
          <Stat label="P" value={macros.protein} color="#38bdf8" />
          <Stat label="C" value={macros.carbs} color="#fbbf24" />
          <Stat label="F" value={macros.fat} color="#f472b6" />
        </div>

        {!pickMode && (
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alsoSave}
              onChange={(e) => setAlsoSave(e.target.checked)}
              className="accent-brand h-4 w-4"
            />
            <Save size={13} /> Save this portion to my foods
          </label>
        )}

        <button
          className="btn-primary w-full"
          disabled={!valid}
          onClick={() => {
            const name = `${selected.name}${g !== 100 ? ` (${round(g)}g)` : ''}`
            if (onPick) {
              onPick(name, macros)
            } else {
              addFood({ date: date!, meal, name, ...macros })
              if (alsoSave) addSavedFood({ name, ...macros })
            }
            setSelected(null)
            // keep query + results so multiple items can be added in a row
            if (!pickMode) {
              setQuery('')
              setResults([])
            }
            onAdded?.()
          }}
        >
          <Plus size={16} /> {pickMode ? pickLabel : 'Add to log'}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* data source toggle */}
      <div className="flex gap-1 rounded-lg bg-surface border border-border p-1 w-fit">
        <button
          onClick={() => setSource('usda')}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
            source === 'usda' ? 'bg-brand text-bg' : 'text-muted hover:text-ink'
          }`}
        >
          USDA
        </button>
        <button
          onClick={() => setSource('off')}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
            source === 'off' ? 'bg-brand text-bg' : 'text-muted hover:text-ink'
          }`}
        >
          Open Food Facts
        </button>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        {loading ? (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-soft animate-spin" />
        ) : null}
        <input
          autoFocus
          className="input pl-9 pr-9"
          placeholder={source === 'usda' ? 'Search foods, e.g. banana, raw…' : 'Search products, e.g. greek yogurt…'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <p className="text-[11px] text-muted">
        {source === 'usda' ? (
          <>
            Precise data from{' '}
            <a href="https://fdc.nal.usda.gov" target="_blank" rel="noreferrer" className="text-brand-soft hover:underline">
              USDA FoodData Central
            </a>
            . Best for whole foods.
          </>
        ) : (
          <>
            Powered by{' '}
            <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer" className="text-brand-soft hover:underline">
              Open Food Facts
            </a>
            . Best for packaged products.
          </>
        )}
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-surface border border-border px-3 py-2.5 text-xs text-muted">
          <AlertCircle size={14} className="text-amber mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <ul className="space-y-1.5 max-h-[26rem] overflow-auto pr-1">
        {results.map((f) => (
          <li key={f.id}>
            <button
              onClick={() => selectFood(f)}
              className="w-full flex items-center gap-3 rounded-xl bg-surface border border-border px-3 py-2 text-left hover:border-brand/40 hover:bg-card-hover transition"
            >
              {f.imageUrl ? (
                <img src={f.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover bg-card shrink-0" />
              ) : (
                <span className="h-9 w-9 rounded-md grid place-items-center bg-card text-muted shrink-0 text-[10px]">
                  IMG
                </span>
              )}
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{f.name}</span>
                <span className="block text-[11px] text-muted truncate">
                  {f.brand ? `${f.brand} · ` : ''}
                  {f.per100g.calories} kcal / 100 g
                </span>
              </span>
              <Plus size={16} className="text-brand-soft shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-base font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  )
}
