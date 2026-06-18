import { useState } from 'react'
import { X, Sparkles, Loader2, AlertCircle, Wand2 } from 'lucide-react'
import type { PlannedExercise } from '../types'
import { useStore } from '../store/useStore'
import { generateWorkout } from '../lib/ai'
import { uid } from '../lib/id'

export interface WorkoutDraft {
  name: string
  day: number | null
  activity: string
  met: number
  durationMin: number
  exercises: PlannedExercise[]
}

interface AIWorkoutDialogProps {
  onClose: () => void
  onGenerated: (draft: WorkoutDraft) => void
}

const IDEAS = [
  'Push day (chest, shoulders, triceps)',
  'Pull day (back, biceps)',
  'Leg + core day',
  'Core + cardio session',
  'Full-body beginner workout',
  'Upper body, dumbbells only',
]

export function AIWorkoutDialog({ onClose, onGenerated }: AIWorkoutDialogProps) {
  const ai = useStore((s) => s.ai)
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    if (!prompt.trim()) return
    setLoading(true)
    setError(null)
    try {
      const w = await generateWorkout(ai, prompt.trim())
      if (w.exercises.length === 0) {
        setError('The AI returned no exercises — try rephrasing your request.')
        return
      }
      const exercises: PlannedExercise[] = w.exercises.map((e) => ({ id: uid(), ...e }))
      onGenerated({
        name: w.name,
        day: null,
        activity: w.activity,
        met: w.met,
        durationMin: w.durationMin,
        exercises,
      })
    } catch (e: any) {
      setError(e?.message ?? 'Could not generate workout.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="card w-full max-w-lg animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Sparkles size={18} className="text-brand-soft" /> Generate workout with AI
          </h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition" aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">What workout do you want?</label>
            <textarea
              className="input min-h-[90px] resize-y"
              autoFocus
              placeholder="e.g. a 45-minute push day with barbell focus, 5 exercises"
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
            The AI drafts a routine with exercises, sets and reps — you'll review and edit it before saving.
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
