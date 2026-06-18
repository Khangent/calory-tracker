import { useMemo, useState } from 'react'
import { X, Plus, Trash2, Globe, BookMarked, PencilLine, Minus } from 'lucide-react'
import type { Recipe, RecipeIngredient } from '../types'
import { useStore } from '../store/useStore'
import { uid } from '../lib/id'
import { sumMacros, round, toNum } from '../lib/calc'
import { FoodSearch } from './FoodSearch'

interface RecipeEditorProps {
  /** Existing recipe to edit. */
  recipe?: Recipe
  /** Prefilled values for a new recipe (e.g. from AI generation). */
  draft?: { name?: string; servings?: number; ingredients?: RecipeIngredient[] }
  onClose: () => void
}

type AddMode = 'search' | 'saved' | 'manual'

export function RecipeEditor({ recipe, draft, onClose }: RecipeEditorProps) {
  const addRecipe = useStore((s) => s.addRecipe)
  const updateRecipe = useStore((s) => s.updateRecipe)

  const [name, setName] = useState(recipe?.name ?? draft?.name ?? '')
  const [servings, setServings] = useState(recipe?.servings ?? draft?.servings ?? 1)
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients ?? draft?.ingredients ?? [],
  )
  const [mode, setMode] = useState<AddMode>('search')

  const total = useMemo(() => sumMacros(ingredients), [ingredients])
  const per = useMemo(() => {
    const s = Math.max(1, servings)
    return {
      calories: total.calories / s,
      protein: total.protein / s,
      carbs: total.carbs / s,
      fat: total.fat / s,
    }
  }, [total, servings])

  const valid = name.trim() !== '' && ingredients.length > 0

  function addIngredient(n: string, m: { calories: number; protein: number; carbs: number; fat: number }) {
    setIngredients((prev) => [...prev, { id: uid(), name: n, ...m }])
  }

  function save() {
    if (!valid) return
    const payload = { name: name.trim(), servings: Math.max(1, servings), ingredients }
    if (recipe) updateRecipe(recipe.id, payload)
    else addRecipe(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="card w-full sm:max-w-2xl max-h-[92vh] overflow-auto rounded-b-none sm:rounded-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between bg-card/95 backdrop-blur border-b border-border px-5 py-4">
          <h2 className="text-base font-bold">{recipe ? 'Edit recipe' : 'New recipe'}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition" aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="p-5 space-y-5">
          {/* name + servings */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="label">Recipe name</label>
              <input
                className="input"
                placeholder="e.g. Chicken & rice bowl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Servings</label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface border border-border text-muted hover:text-ink"
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                >
                  <Minus size={15} />
                </button>
                <input
                  className="input text-center tabular-nums px-1"
                  type="number"
                  min="1"
                  value={servings}
                  onChange={(e) => setServings(Math.max(1, Math.round(toNum(e.target.value)) || 1))}
                />
                <button
                  type="button"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-surface border border-border text-muted hover:text-ink"
                  onClick={() => setServings((s) => s + 1)}
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          </div>

          {/* totals panel */}
          <div className="rounded-xl bg-surface border border-border p-3">
            <div className="flex items-center justify-between text-xs text-muted mb-2">
              <span>Whole recipe</span>
              <span>Per serving ({Math.max(1, servings)}×)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MacroRow m={total} />
              <MacroRow m={per} highlight />
            </div>
          </div>

          {/* ingredient list */}
          <div>
            <label className="label">Ingredients ({ingredients.length})</label>
            {ingredients.length === 0 ? (
              <p className="text-xs text-muted/70 py-2">No ingredients yet — add some below.</p>
            ) : (
              <ul className="space-y-1.5">
                {ingredients.map((ing) => (
                  <li
                    key={ing.id}
                    className="flex items-center gap-3 rounded-xl bg-surface border border-border px-3 py-2 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ing.name}</div>
                      <div className="text-[11px] text-muted tabular-nums">
                        {round(ing.calories)} kcal · {round(ing.protein)}P / {round(ing.carbs)}C / {round(ing.fat)}F
                      </div>
                    </div>
                    <button
                      onClick={() => setIngredients((prev) => prev.filter((x) => x.id !== ing.id))}
                      className="text-muted/50 hover:text-fat transition opacity-0 group-hover:opacity-100"
                      aria-label="Remove ingredient"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* add ingredient */}
          <div className="rounded-xl border border-border p-3 bg-bg/40">
            <div className="flex gap-1 rounded-lg bg-surface border border-border p-1 mb-3 w-fit">
              <ModeBtn active={mode === 'search'} onClick={() => setMode('search')} icon={Globe} label="Search" />
              <ModeBtn active={mode === 'saved'} onClick={() => setMode('saved')} icon={BookMarked} label="My foods" />
              <ModeBtn active={mode === 'manual'} onClick={() => setMode('manual')} icon={PencilLine} label="Manual" />
            </div>

            {mode === 'search' && <FoodSearch onPick={addIngredient} pickLabel="Add ingredient" />}
            {mode === 'saved' && <SavedPicker onPick={addIngredient} />}
            {mode === 'manual' && <ManualIngredient onPick={addIngredient} />}
          </div>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-3 bg-card/95 backdrop-blur border-t border-border px-5 py-4">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={save} disabled={!valid} className="btn-primary">
            {recipe ? 'Save changes' : 'Create recipe'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function MacroRow({ m, highlight }: { m: { calories: number; protein: number; carbs: number; fat: number }; highlight?: boolean }) {
  return (
    <div className={`text-center rounded-lg py-2 ${highlight ? 'bg-brand/10' : ''}`}>
      <div className={`text-lg font-bold tabular-nums ${highlight ? 'text-brand-soft' : ''}`}>{round(m.calories)}</div>
      <div className="text-[10px] text-muted mb-1">kcal</div>
      <div className="text-[11px] text-muted tabular-nums">
        {round(m.protein)}P · {round(m.carbs)}C · {round(m.fat)}F
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

function SavedPicker({ onPick }: { onPick: (name: string, m: any) => void }) {
  const savedFoods = useStore((s) => s.savedFoods)
  const [q, setQ] = useState('')
  const filtered = savedFoods.filter((f) => f.name.toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-2">
      <input className="input" placeholder="Search my foods…" value={q} onChange={(e) => setQ(e.target.value)} />
      <ul className="space-y-1.5 max-h-60 overflow-auto pr-1">
        {filtered.length === 0 && <li className="text-xs text-muted/70 py-1">No matches.</li>}
        {filtered.map((f) => (
          <li key={f.id}>
            <button
              onClick={() =>
                onPick(f.name, { calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat })
              }
              className="w-full flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-2 text-left hover:border-brand/40 transition"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium truncate">{f.name}</span>
                <span className="block text-[11px] text-muted tabular-nums">
                  {round(f.calories)} kcal · {round(f.protein)}P / {round(f.carbs)}C / {round(f.fat)}F
                </span>
              </span>
              <Plus size={15} className="text-brand-soft shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ManualIngredient({ onPick }: { onPick: (name: string, m: any) => void }) {
  const [name, setName] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const valid = name.trim() !== '' && toNum(calories) > 0

  function add() {
    if (!valid) return
    onPick(name.trim(), {
      calories: toNum(calories),
      protein: toNum(protein),
      carbs: toNum(carbs),
      fat: toNum(fat),
    })
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
  }

  return (
    <div className="space-y-3">
      <input className="input" placeholder="Ingredient name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="grid grid-cols-4 gap-2">
        <Mini label="kcal" value={calories} onChange={setCalories} />
        <Mini label="P" value={protein} onChange={setProtein} />
        <Mini label="C" value={carbs} onChange={setCarbs} />
        <Mini label="F" value={fat} onChange={setFat} />
      </div>
      <button onClick={add} disabled={!valid} className="btn-ghost w-full">
        <Plus size={15} /> Add ingredient
      </button>
    </div>
  )
}

function Mini({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-muted mb-1 text-center">{label}</label>
      <input
        className="input text-center tabular-nums px-1"
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
