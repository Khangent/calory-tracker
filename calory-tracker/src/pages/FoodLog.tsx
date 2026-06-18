import { useMemo, useState } from 'react'
import { Trash2, X, PencilLine, Globe, ChefHat, Plus, Sparkles, UtensilsCrossed } from 'lucide-react'
import type { MealType, Recipe } from '../types'
import { MEALS } from '../types'
import { useStore } from '../store/useStore'
import { todayKey } from '../lib/date'
import { entriesForDate, sumMacros, round, perServing, scaleMacros, toNum } from '../lib/calc'
import { Card } from '../components/ui/Card'
import { DateNav } from '../components/DateNav'
import { AddFoodForm } from '../components/AddFoodForm'
import { FoodSearch } from '../components/FoodSearch'
import { AIFoodLogger } from '../components/AIFoodLogger'
import { Recipes } from './Recipes'

type Section = 'diary' | 'recipes'

/** Parent page that fuses the daily food diary with recipe management via sub-tabs. */
export function FoodLog() {
  const [section, setSection] = useState<Section>('diary')
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Food</h1>
        <div className="flex gap-1 rounded-xl bg-surface border border-border p-1">
          <button
            onClick={() => setSection('diary')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              section === 'diary' ? 'bg-brand text-bg' : 'text-muted hover:text-ink'
            }`}
          >
            <UtensilsCrossed size={15} /> Diary
          </button>
          <button
            onClick={() => setSection('recipes')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              section === 'recipes' ? 'bg-brand text-bg' : 'text-muted hover:text-ink'
            }`}
          >
            <ChefHat size={15} /> Recipes
          </button>
        </div>
      </div>

      {section === 'diary' ? <FoodDiary /> : <Recipes embedded />}
    </div>
  )
}

function FoodDiary() {
  const [date, setDate] = useState(todayKey())
  const [addMeal, setAddMeal] = useState<MealType | null>(null)
  const foods = useStore((s) => s.foods)
  const removeFood = useStore((s) => s.removeFood)

  const dayEntries = useMemo(() => entriesForDate(foods, date), [foods, date])
  const dayTotal = sumMacros(dayEntries)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {round(dayTotal.calories)} kcal · {round(dayTotal.protein)}P / {round(dayTotal.carbs)}C / {round(dayTotal.fat)}F
        </p>
        <DateNav date={date} onChange={setDate} />
      </div>

      <div className="space-y-4">
        {MEALS.map((m) => {
            const items = dayEntries.filter((e) => e.meal === m.key)
            const subtotal = sumMacros(items)
            return (
              <Card key={m.key}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <span>{m.icon}</span> {m.label}
                  </h3>
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs text-muted tabular-nums">{round(subtotal.calories)} kcal</span>
                    <button
                      onClick={() => setAddMeal(m.key)}
                      className="grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-brand-soft hover:bg-brand/25 active:scale-95 transition"
                      aria-label={`Add food to ${m.label}`}
                      title={`Add food to ${m.label}`}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
                {items.length === 0 ? (
                  <button
                    onClick={() => setAddMeal(m.key)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-xs text-muted hover:text-brand-soft hover:border-brand/40 transition py-3"
                  >
                    <Plus size={14} /> Add food to {m.label.toLowerCase()}
                  </button>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {items.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 py-2.5 group">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{e.name}</div>
                          <div className="text-[11px] text-muted tabular-nums">
                            {round(e.protein)}P · {round(e.carbs)}C · {round(e.fat)}F
                          </div>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{round(e.calories)}</span>
                        <button
                          onClick={() => removeFood(e.id)}
                          className="text-muted/50 hover:text-fat transition opacity-0 group-hover:opacity-100"
                          aria-label="Delete entry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )
          })}
      </div>

      {addMeal && <AddFoodModal date={date} meal={addMeal} onClose={() => setAddMeal(null)} />}
    </div>
  )
}

type AddMode = 'ai' | 'search' | 'recipe' | 'manual'

const SUBTITLES: Record<AddMode, string> = {
  ai: 'Describe a meal in plain language',
  search: 'Search the food database',
  recipe: 'Log one of your recipes',
  manual: 'Enter macros manually',
}

/** The 4-mode add-food UI (AI / Search / Recipe / Manual), optionally targeted at a meal. */
function AddFoodPanel({ date, defaultMeal, onAdded }: { date: string; defaultMeal?: MealType; onAdded?: () => void }) {
  const [mode, setMode] = useState<AddMode>('ai')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg bg-surface border border-border p-1 w-fit">
        <ModeBtn active={mode === 'ai'} onClick={() => setMode('ai')} icon={Sparkles} label="AI" />
        <ModeBtn active={mode === 'search'} onClick={() => setMode('search')} icon={Globe} label="Search" />
        <ModeBtn active={mode === 'recipe'} onClick={() => setMode('recipe')} icon={ChefHat} label="Recipe" />
        <ModeBtn active={mode === 'manual'} onClick={() => setMode('manual')} icon={PencilLine} label="Manual" />
      </div>
      <p className="text-xs text-muted">{SUBTITLES[mode]}</p>
      {mode === 'ai' && <AIFoodLogger date={date} defaultMeal={defaultMeal} onAdded={onAdded} />}
      {mode === 'search' && <FoodSearch date={date} defaultMeal={defaultMeal} onAdded={onAdded} />}
      {mode === 'recipe' && <RecipePicker date={date} defaultMeal={defaultMeal} onAdded={onAdded} />}
      {mode === 'manual' && <AddFoodForm date={date} defaultMeal={defaultMeal} onAdded={onAdded} />}
    </div>
  )
}

/** Meal-targeted add dialog opened from a meal's "+" button. */
function AddFoodModal({ date, meal, onClose }: { date: string; meal: MealType; onClose: () => void }) {
  const mealDef = MEALS.find((m) => m.key === meal)
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="card w-full sm:max-w-lg max-h-[92vh] overflow-auto rounded-b-none sm:rounded-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between bg-card/95 backdrop-blur border-b border-border px-5 py-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <span>{mealDef?.icon}</span> Add to {mealDef?.label}
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition" aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <div className="p-5">
          <AddFoodPanel date={date} defaultMeal={meal} onAdded={onClose} />
        </div>
      </div>
    </div>
  )
}

function ModeBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Globe
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
        active ? 'bg-brand text-bg' : 'text-muted hover:text-ink'
      }`}
    >
      <Icon size={13} /> {label}
    </button>
  )
}

function RecipePicker({ date, defaultMeal = 'dinner', onAdded }: { date: string; defaultMeal?: MealType; onAdded?: () => void }) {
  const recipes = useStore((s) => s.recipes)
  const logRecipe = useStore((s) => s.logRecipe)
  const [selected, setSelected] = useState<Recipe | null>(null)
  const [servings, setServings] = useState('1')
  const [meal, setMeal] = useState<MealType>(defaultMeal)

  if (recipes.length === 0) {
    return (
      <div className="text-center py-8">
        <ChefHat className="mx-auto text-muted/40 mb-2" size={28} />
        <p className="text-sm text-muted">No recipes yet.</p>
        <p className="text-xs text-muted/60">Create one under the Recipes tab to log it here.</p>
      </div>
    )
  }

  if (selected) {
    const n = toNum(servings) || 1
    const macros = scaleMacros(perServing(selected), n)
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelected(null)}
          className="text-xs font-medium text-muted hover:text-ink transition"
        >
          ← Back to recipes
        </button>
        <div>
          <div className="text-sm font-semibold">{selected.name}</div>
          <div className="text-[11px] text-muted">
            {selected.servings} serving{selected.servings > 1 ? 's' : ''} in this recipe
          </div>
        </div>

        <div>
          <label className="label">Servings to log</label>
          <input
            className="input tabular-nums"
            type="number"
            min="0"
            step="0.25"
            inputMode="decimal"
            value={servings}
            onChange={(e) => setServings(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Meal</label>
          <div className="flex flex-wrap gap-2">
            {MEALS.map((m) => (
              <button key={m.key} onClick={() => setMeal(m.key)} className={`chip ${meal === m.key ? 'chip-active' : ''}`}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-surface border border-border p-3 grid grid-cols-4 gap-2 text-center">
          <PreviewStat label="kcal" value={round(macros.calories)} color="#22c55e" />
          <PreviewStat label="P" value={round(macros.protein)} color="#38bdf8" />
          <PreviewStat label="C" value={round(macros.carbs)} color="#fbbf24" />
          <PreviewStat label="F" value={round(macros.fat)} color="#f472b6" />
        </div>

        <button
          className="btn-primary w-full"
          disabled={n <= 0}
          onClick={() => {
            logRecipe(selected, date, meal, n)
            setSelected(null)
            setServings('1')
            onAdded?.()
          }}
        >
          <Plus size={16} /> Add to log
        </button>
      </div>
    )
  }

  return (
    <ul className="space-y-1.5 max-h-[28rem] overflow-auto pr-1">
      {recipes.map((r) => {
        const per = perServing(r)
        return (
          <li key={r.id}>
            <button
              onClick={() => {
                setSelected(r)
                setServings('1')
              }}
              className="w-full flex items-center gap-3 rounded-xl bg-surface border border-border px-3 py-2.5 text-left hover:border-brand/40 hover:bg-card-hover transition"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-card text-brand-soft shrink-0">
                <ChefHat size={16} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{r.name}</span>
                <span className="block text-[11px] text-muted tabular-nums">
                  {round(per.calories)} kcal/serving · {round(per.protein)}P / {round(per.carbs)}C / {round(per.fat)}F
                </span>
              </span>
              <Plus size={16} className="text-brand-soft shrink-0" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function PreviewStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="text-base font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-muted">{label}</div>
    </div>
  )
}

