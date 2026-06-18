import { useState } from 'react'
import { X, Sparkles, Loader2, AlertCircle, Wand2 } from 'lucide-react'
import type { RecipeIngredient } from '../types'
import { useStore } from '../store/useStore'
import { generateRecipe } from '../lib/ai'
import { uid } from '../lib/id'

interface AIRecipeDialogProps {
  onClose: () => void
  onGenerated: (draft: { name: string; servings: number; ingredients: RecipeIngredient[] }) => void
}

const IDEAS = [
  'High-protein vegetarian dinner under 600 kcal',
  'Quick post-workout breakfast, ~40g protein',
  'Budget meal-prep lunch for the week',
  'Low-carb chicken dinner for 2',
]

export function AIRecipeDialog({ onClose, onGenerated }: AIRecipeDialogProps) {
  const ai = useStore((s) => s.ai)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    try {
      const r = await generateRecipe(ai, prompt.trim())
      if (r.ingredients.length === 0) {
        setError('The AI returned no ingredients — try rephrasing your request.')
        return
      }
      const ingredients: RecipeIngredient[] = r.ingredients.map((ing) => ({ id: uid(), ...ing }))
      onGenerated({ name: r.name, servings: r.servings, ingredients })
    } catch (e: any) {
      setError(e?.message ?? 'Could not generate recipe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-brand-soft" /> Generate recipe with AI
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition" aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">What do you want to make?</label>
            <textarea
              className="input min-h-[90px] resize-y"
              autoFocus
              placeholder="e.g. a high-protein vegetarian curry for 4 servings, under 500 kcal each"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {IDEAS.map((idea) => (
                <button key={idea} type="button" onClick={() => setPrompt(idea)} className="chip text-[11px]">
                  {idea}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-surface border border-border px-3 py-2.5 text-xs text-muted">
              <AlertCircle size={14} className="text-amber mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-[11px] text-muted">
            The AI drafts a recipe with estimated macros — you'll review and edit it before saving.
          </p>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={run} disabled={loading || !prompt.trim()} className="btn-primary">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </footer>
      </div>
    </div>
  )
}
