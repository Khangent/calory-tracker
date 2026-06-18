import { useMemo, useState } from 'react'
import { X, Plus, Trash2, GripVertical, Search, Library } from 'lucide-react'
import type { Routine, PlannedExercise } from '../types'
import { useStore } from '../store/useStore'
import { uid } from '../lib/id'
import { toNum } from '../lib/calc'
import { ACTIVITIES, WEEKDAYS_LONG } from '../lib/fitness'
import { EXERCISE_CATALOG, EXERCISE_CATEGORIES, type ExerciseCategory } from '../lib/exercises'

interface RoutineEditorProps {
  routine?: Routine
  /** Prefilled values for a new routine (e.g. from AI generation). */
  draft?: {
    name?: string
    day?: number | null
    activity?: string
    met?: number
    durationMin?: number
    exercises?: PlannedExercise[]
  }
  onClose: () => void
}

export function RoutineEditor({ routine, draft, onClose }: RoutineEditorProps) {
  const addRoutine = useStore((s) => s.addRoutine)
  const updateRoutine = useStore((s) => s.updateRoutine)

  const init = routine ?? draft
  const [name, setName] = useState(init?.name ?? '')
  const [day, setDay] = useState<number | null>(init?.day ?? null)
  const [activity, setActivity] = useState(init?.activity ?? 'Weight training')
  const [met, setMet] = useState(init?.met ?? 5)
  const [durationMin, setDurationMin] = useState(init?.durationMin ?? 60)
  const [exercises, setExercises] = useState<PlannedExercise[]>(init?.exercises ?? [])

  // exercise library picker state
  const [libCat, setLibCat] = useState<ExerciseCategory | 'All'>('All')
  const [libQ, setLibQ] = useState('')

  const valid = name.trim() !== ''

  const libResults = useMemo(() => {
    const q = libQ.trim().toLowerCase()
    return EXERCISE_CATALOG.filter(
      (e) => (libCat === 'All' || e.category === libCat) && (q === '' || e.name.toLowerCase().includes(q)),
    )
  }, [libCat, libQ])

  function addFromLibrary(name: string, sets?: number, reps?: number, note?: string) {
    setExercises((prev) => {
      if (prev.some((e) => e.name.toLowerCase() === name.toLowerCase())) return prev // avoid dupes
      return [...prev, { id: uid(), name, sets, reps, note }]
    })
  }

  function setActivityByName(n: string) {
    setActivity(n)
    const a = ACTIVITIES.find((x) => x.name === n)
    if (a) setMet(a.met)
  }

  function addExercise() {
    setExercises((prev) => [...prev, { id: uid(), name: '', sets: undefined, reps: undefined }])
  }
  function patchExercise(id: string, p: Partial<PlannedExercise>) {
    setExercises((prev) => prev.map((e) => (e.id === id ? { ...e, ...p } : e)))
  }

  function save() {
    if (!valid) return
    const payload = {
      name: name.trim(),
      day,
      activity,
      met,
      durationMin: Math.max(1, durationMin),
      exercises: exercises.filter((e) => e.name.trim() !== ''),
    }
    if (routine) updateRoutine(routine.id, payload)
    else addRoutine(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div
        className="card w-full sm:max-w-2xl max-h-[92vh] overflow-auto rounded-b-none sm:rounded-2xl animate-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sticky top-0 z-10 flex items-center justify-between bg-card/95 backdrop-blur border-b border-border px-5 py-4">
          <h2 className="text-base font-bold">{routine ? 'Edit routine' : 'New routine'}</h2>
          <button onClick={onClose} className="text-muted hover:text-ink transition" aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <div className="p-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Routine name</label>
              <input
                className="input"
                placeholder="e.g. Push Day"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <label className="label">Scheduled day</label>
              <select
                className="input"
                value={day === null ? '' : day}
                onChange={(e) => setDay(e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">Unscheduled</option>
                {WEEKDAYS_LONG.map((d, i) => (
                  <option key={i} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="label">Activity (for calorie estimate)</label>
              <select className="input" value={activity} onChange={(e) => setActivityByName(e.target.value)}>
                {ACTIVITIES.map((a) => (
                  <option key={a.name} value={a.name}>
                    {a.icon} {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Duration (min)</label>
              <input
                className="input tabular-nums"
                type="number"
                min="1"
                value={durationMin}
                onChange={(e) => setDurationMin(Math.max(1, Math.round(toNum(e.target.value))))}
              />
            </div>
          </div>

          {/* exercises */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Exercises ({exercises.length})</label>
              <button onClick={addExercise} className="text-xs font-semibold text-brand-soft hover:underline flex items-center gap-1">
                <Plus size={13} /> Add exercise
              </button>
            </div>
            {exercises.length === 0 ? (
              <p className="text-xs text-muted/70 py-2">Optional — list the exercises in this routine.</p>
            ) : (
              <ul className="space-y-2">
                {exercises.map((e) => (
                  <li key={e.id} className="flex items-center gap-2 rounded-xl bg-surface border border-border px-2 py-2">
                    <GripVertical size={15} className="text-muted/40 shrink-0" />
                    <input
                      className="input flex-1 py-1.5"
                      placeholder="Exercise name"
                      value={e.name}
                      onChange={(ev) => patchExercise(e.id, { name: ev.target.value })}
                    />
                    <input
                      className="input w-16 py-1.5 text-center tabular-nums"
                      type="number"
                      min="0"
                      placeholder="sets"
                      value={e.sets ?? ''}
                      onChange={(ev) => patchExercise(e.id, { sets: ev.target.value ? Math.round(toNum(ev.target.value)) : undefined })}
                    />
                    <span className="text-muted text-xs">×</span>
                    <input
                      className="input w-16 py-1.5 text-center tabular-nums"
                      type="number"
                      min="0"
                      placeholder="reps"
                      value={e.reps ?? ''}
                      onChange={(ev) => patchExercise(e.id, { reps: ev.target.value ? Math.round(toNum(ev.target.value)) : undefined })}
                    />
                    <button
                      onClick={() => setExercises((prev) => prev.filter((x) => x.id !== e.id))}
                      className="text-muted/50 hover:text-fat transition shrink-0 px-1"
                      aria-label="Remove exercise"
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* exercise library */}
          <div className="rounded-xl border border-border bg-bg/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <Library size={15} className="text-brand-soft" />
              <span className="text-sm font-semibold">Add from library</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {(['All', ...EXERCISE_CATEGORIES] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setLibCat(c)}
                  className={`chip text-[11px] ${libCat === c ? 'chip-active' : ''}`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="relative mb-2">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-9 py-1.5"
                placeholder="Search exercises…"
                value={libQ}
                onChange={(e) => setLibQ(e.target.value)}
              />
            </div>

            <ul className="grid sm:grid-cols-2 gap-1.5 max-h-60 overflow-auto pr-1">
              {libResults.length === 0 && <li className="text-xs text-muted/70 py-1">No matches.</li>}
              {libResults.map((e) => {
                const added = exercises.some((x) => x.name.toLowerCase() === e.name.toLowerCase())
                return (
                  <li key={e.name}>
                    <button
                      type="button"
                      disabled={added}
                      onClick={() => addFromLibrary(e.name, e.sets, e.reps, e.note)}
                      className={`w-full flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                        added
                          ? 'bg-surface border-border opacity-50'
                          : 'bg-surface border-border hover:border-brand/40 hover:bg-card-hover'
                      }`}
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{e.name}</span>
                        <span className="block text-[10px] text-muted">
                          {e.category}
                          {e.sets && e.reps ? ` · ${e.sets}×${e.reps}` : e.note ? ` · ${e.note}` : ''}
                        </span>
                      </span>
                      <Plus size={14} className={added ? 'text-muted/40 shrink-0' : 'text-brand-soft shrink-0'} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>

        <footer className="sticky bottom-0 flex items-center justify-end gap-3 bg-card/95 backdrop-blur border-t border-border px-5 py-4">
          <button onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button onClick={save} disabled={!valid} className="btn-primary">
            {routine ? 'Save changes' : 'Create routine'}
          </button>
        </footer>
      </div>
    </div>
  )
}
