import { useState } from 'react'
import { Plus, Pencil, Trash2, ChefHat, Utensils, Sparkles } from 'lucide-react'
import type { Recipe, RecipeIngredient } from '../types'
import { useStore } from '../store/useStore'
import { recipeTotals, perServing, round } from '../lib/calc'
import { aiConfigured } from '../lib/ai'
import { Card } from '../components/ui/Card'
import { RecipeEditor } from '../components/RecipeEditor'
import { AIRecipeDialog } from '../components/AIRecipeDialog'

type Draft = { name: string; servings: number; ingredients: RecipeIngredient[] }

export function Recipes({ embedded = false }: { embedded?: boolean }) {
  const recipes = useStore((s) => s.recipes)
  const removeRecipe = useStore((s) => s.removeRecipe)
  const ai = useStore((s) => s.ai)
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [aiOpen, setAiOpen] = useState(false)

  function closeEditor() {
    setEditing(null)
    setCreating(false)
    setDraft(null)
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {!embedded && <h1 className="text-2xl font-extrabold tracking-tight">Meals &amp; Recipes</h1>}
          <p className={`text-sm text-muted ${embedded ? '' : 'mt-1'}`}>
            Build meals you make often, then log them in one tap.
          </p>
        </div>
        <div className="flex gap-2">
          {aiConfigured(ai) && (
            <button onClick={() => setAiOpen(true)} className="btn-ghost">
              <Sparkles size={16} /> Generate with AI
            </button>
          )}
          <button onClick={() => setCreating(true)} className="btn-primary">
            <Plus size={16} /> New recipe
          </button>
        </div>
      </header>

      {recipes.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <ChefHat className="mx-auto text-muted/40 mb-3" size={40} />
            <p className="text-sm font-medium">No recipes yet</p>
            <p className="text-xs text-muted mt-1 mb-4">
              Create your first meal — add ingredients and we'll do the macro math.
            </p>
            <button onClick={() => setCreating(true)} className="btn-primary mx-auto">
              <Plus size={16} /> New recipe
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => {
            const total = recipeTotals(r)
            const per = perServing(r)
            return (
              <div key={r.id} className="card p-5 flex flex-col animate-fade-up">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold truncate">{r.name}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {r.servings} serving{r.servings > 1 ? 's' : ''} · {r.ingredients.length} ingredient
                      {r.ingredients.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setEditing(r)}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-surface border border-border text-muted hover:text-ink transition"
                      aria-label="Edit recipe"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete "${r.name}"?`)) removeRecipe(r.id)
                      }}
                      className="grid h-8 w-8 place-items-center rounded-lg bg-surface border border-border text-muted hover:text-fat transition"
                      aria-label="Delete recipe"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Box label="Per serving" value={round(per.calories)} sub={`${round(per.protein)}P·${round(per.carbs)}C·${round(per.fat)}F`} highlight />
                  <Box label="Whole recipe" value={round(total.calories)} sub={`${round(total.protein)}P·${round(total.carbs)}C·${round(total.fat)}F`} />
                </div>

                <ul className="mt-4 space-y-1 text-xs text-muted flex-1">
                  {r.ingredients.slice(0, 4).map((ing) => (
                    <li key={ing.id} className="flex items-center gap-1.5 truncate">
                      <Utensils size={11} className="text-brand-soft shrink-0" />
                      <span className="truncate">{ing.name}</span>
                    </li>
                  ))}
                  {r.ingredients.length > 4 && (
                    <li className="text-muted/60">+{r.ingredients.length - 4} more…</li>
                  )}
                </ul>
              </div>
            )
          })}
        </div>
      )}

      {(creating || editing) && (
        <RecipeEditor recipe={editing ?? undefined} draft={draft ?? undefined} onClose={closeEditor} />
      )}

      {aiOpen && (
        <AIRecipeDialog
          onClose={() => setAiOpen(false)}
          onGenerated={(d) => {
            setAiOpen(false)
            setDraft(d)
            setCreating(true)
          }}
        />
      )}
    </div>
  )
}

function Box({ label, value, sub, highlight }: { label: string; value: number; sub: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border border-border p-3 ${highlight ? 'bg-brand/10' : 'bg-surface'}`}>
      <div className="text-[10px] text-muted">{label}</div>
      <div className={`text-xl font-bold tabular-nums ${highlight ? 'text-brand-soft' : ''}`}>
        {value} <span className="text-xs font-medium text-muted">kcal</span>
      </div>
      <div className="text-[11px] text-muted tabular-nums mt-0.5">{sub}</div>
    </div>
  )
}
