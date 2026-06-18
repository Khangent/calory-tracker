import { useEffect, useMemo, useState } from 'react'
import {
  Dumbbell,
  Flame,
  Plus,
  Trash2,
  Pencil,
  CalendarDays,
  Clock,
  Zap,
  ListChecks,
  Sparkles,
  Footprints,
} from 'lucide-react'
import type { Routine } from '../types'
import { useStore } from '../store/useStore'
import { todayKey } from '../lib/date'
import { round, toNum } from '../lib/calc'
import { aiConfigured } from '../lib/ai'
import {
  ACTIVITIES,
  estimateBurn,
  bodyWeightKg,
  workoutsForDate,
  caloriesBurnedForDate,
  kcalFromSteps,
  weekdayOf,
  WEEKDAYS,
  WEEKDAYS_LONG,
} from '../lib/fitness'
import { WORKOUT_TEMPLATES, toPlanned } from '../lib/exercises'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { DateNav } from '../components/DateNav'
import { RoutineEditor } from '../components/RoutineEditor'
import { AIWorkoutDialog, type WorkoutDraft } from '../components/AIWorkoutDialog'

export function Fitness() {
  const [section, setSection] = useState<'log' | 'plan'>('log')
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Fitness</h1>
          <p className="text-sm text-muted mt-1">
            Log workouts and plan your training. Burned calories top up your daily budget.
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-surface border border-border p-1">
          <button
            onClick={() => setSection('log')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              section === 'log' ? 'bg-brand text-bg' : 'text-muted hover:text-ink'
            }`}
          >
            <Flame size={14} /> Workout log
          </button>
          <button
            onClick={() => setSection('plan')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              section === 'plan' ? 'bg-brand text-bg' : 'text-muted hover:text-ink'
            }`}
          >
            <CalendarDays size={14} /> Workout plan
          </button>
        </div>
      </header>

      {section === 'log' ? <WorkoutLog /> : <WorkoutPlan />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Workout log
// ---------------------------------------------------------------------------

function WorkoutLog() {
  const [date, setDate] = useState(todayKey())
  const workouts = useStore((s) => s.workouts)
  const routines = useStore((s) => s.routines)
  const removeWorkout = useStore((s) => s.removeWorkout)
  const addWorkout = useStore((s) => s.addWorkout)
  const logRoutine = useStore((s) => s.logRoutine)
  const weights = useStore((s) => s.weights)
  const steps = useStore((s) => s.steps)
  const settings = useStore((s) => s.settings)
  const goalCalories = settings.goals.calories

  const weightKg = useMemo(() => bodyWeightKg(weights, settings), [weights, settings])
  const dayWorkouts = useMemo(() => workoutsForDate(workouts, date), [workouts, date])
  const workoutBurn = caloriesBurnedForDate(workouts, date)
  const stepCount = steps[date] ?? 0
  const stepBurn = kcalFromSteps(stepCount, weightKg)
  const burned = workoutBurn + stepBurn

  // all routines, with today's scheduled ones surfaced first — for quick logging from this page
  const todayWd = weekdayOf(date)
  const sortedRoutines = useMemo(
    () =>
      [...routines].sort((a, b) => {
        const at = a.day === todayWd ? 0 : 1
        const bt = b.day === todayWd ? 0 : 1
        return at - bt || a.name.localeCompare(b.name)
      }),
    [routines, todayWd],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-4">
          <StatCard
            label="Burned today"
            value={`${round(burned)} kcal`}
            hint={`${dayWorkouts.length} workout${dayWorkouts.length !== 1 ? 's' : ''} · ${stepBurn} from steps`}
            icon={Flame}
            accent="#fbbf24"
          />
          <StatCard
            label="Adjusted budget"
            value={`${round(goalCalories + (settings.addExerciseToBudget ? burned : 0))} kcal`}
            hint={settings.addExerciseToBudget ? `${goalCalories} goal + ${round(burned)} active` : 'exercise not added'}
            icon={Zap}
            accent="#22c55e"
          />
        </div>
        <DateNav date={date} onChange={setDate} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* logged workouts */}
        <div className="lg:col-span-3 space-y-6">
          <Card title="Workouts" subtitle={dayWorkouts.length ? `${round(burned)} kcal burned` : undefined}>
            {dayWorkouts.length === 0 ? (
              <div className="text-center py-10">
                <Dumbbell className="mx-auto text-muted/40 mb-2" size={30} />
                <p className="text-sm text-muted">No workouts logged.</p>
                <p className="text-xs text-muted/60">Add one on the right →</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/70">
                {dayWorkouts.map((w) => {
                  const act = ACTIVITIES.find((a) => a.name === w.activity)
                  return (
                    <li key={w.id} className="flex items-center gap-3 py-2.5 group">
                      <span className="text-lg shrink-0">{act?.icon ?? '💪'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{w.activity}</div>
                        <div className="text-[11px] text-muted flex items-center gap-1">
                          <Clock size={11} /> {w.minutes} min
                        </div>
                      </div>
                      <span className="text-sm font-semibold tabular-nums text-amber">{round(w.calories)} kcal</span>
                      <button
                        onClick={() => removeWorkout(w.id)}
                        className="text-muted/50 hover:text-fat transition opacity-0 group-hover:opacity-100"
                        aria-label="Delete workout"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {routines.length > 0 && (
            <Card
              title="Log a routine"
              subtitle={`Tap to add one of your routines to ${WEEKDAYS_LONG[weekdayOf(date)]}`}
            >
              <ul className="space-y-2 max-h-80 overflow-auto pr-1">
                {sortedRoutines.map((r) => {
                  const cals = estimateBurn(r.met, r.durationMin, weightKg)
                  const scheduledToday = r.day === weekdayOf(date)
                  return (
                    <li key={r.id} className="flex items-center gap-3 rounded-xl bg-surface border border-border px-3 py-2.5">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-card text-brand-soft shrink-0">
                        <Dumbbell size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          {r.name}
                          {scheduledToday && (
                            <span className="rounded-full bg-brand/15 text-brand-soft text-[10px] font-semibold px-1.5 py-0.5">
                              Today
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted">
                          {r.durationMin} min · ~{cals} kcal · {r.exercises.length} exercises
                        </div>
                      </div>
                      <button onClick={() => logRoutine(r, date, cals)} className="btn-primary py-1.5 px-3 text-xs shrink-0">
                        <Plus size={14} /> Log
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </div>

        {/* steps + add workout */}
        <div className="lg:col-span-2 space-y-6">
          <StepsCard date={date} stepCount={stepCount} stepBurn={stepBurn} goal={settings.stepGoal} />
          <Card title="Log a workout" subtitle="Calories estimated from your weight & duration">
            <AddWorkoutForm date={date} weightKg={weightKg} onAdd={addWorkout} />
          </Card>
        </div>
      </div>
    </div>
  )
}

function StepsCard({
  date,
  stepCount,
  stepBurn,
  goal: goalProp,
}: {
  date: string
  stepCount: number
  stepBurn: number
  goal: number
}) {
  const setSteps = useStore((s) => s.setSteps)
  const goal = goalProp || 10000 // guard against undefined from older persisted settings
  const [value, setValue] = useState(String(stepCount || ''))

  // keep the field in sync when the date / stored value changes
  useEffect(() => {
    setValue(stepCount ? String(stepCount) : '')
  }, [stepCount, date])

  const pct = goal > 0 ? Math.min(100, Math.round((stepCount / goal) * 100)) : 0

  function commit(v: string) {
    setSteps(date, Math.max(0, Math.round(toNum(v))))
  }

  return (
    <Card title="Steps" subtitle="Counts toward your calorie budget">
      <div className="flex items-center gap-3 mb-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand-soft shrink-0">
          <Footprints size={20} />
        </span>
        <input
          className="input tabular-nums text-lg font-semibold"
          type="number"
          min="0"
          step="100"
          inputMode="numeric"
          placeholder="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
        />
      </div>

      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted tabular-nums">
          {stepCount.toLocaleString()} / {goal.toLocaleString()} ({pct}%)
        </span>
        <span className="text-amber font-medium tabular-nums flex items-center gap-1">
          <Flame size={12} /> ~{stepBurn} kcal
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {[2500, 5000, 7500, 10000].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setValue(String(s))
              commit(String(s))
            }}
            className="chip text-[11px]"
          >
            {s.toLocaleString()}
          </button>
        ))}
      </div>
    </Card>
  )
}

function AddWorkoutForm({
  date,
  weightKg,
  onAdd,
}: {
  date: string
  weightKg: number
  onAdd: ReturnType<typeof useStore.getState>['addWorkout']
}) {
  const [activity, setActivity] = useState('Running')
  const [met, setMet] = useState(9.8)
  const [minutes, setMinutes] = useState('30')
  const [calories, setCalories] = useState(String(estimateBurn(9.8, 30, weightKg)))

  function recompute(nextMet: number, nextMinutes: string) {
    setCalories(String(estimateBurn(nextMet, toNum(nextMinutes), weightKg)))
  }

  function pickActivity(name: string) {
    const a = ACTIVITIES.find((x) => x.name === name)
    const m = a?.met ?? 5
    setActivity(name)
    setMet(m)
    recompute(m, minutes)
  }

  const valid = toNum(minutes) > 0 && toNum(calories) >= 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onAdd({ date, activity, met, minutes: round(toNum(minutes)), calories: round(toNum(calories)) })
    setMinutes('30')
    recompute(met, '30')
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Activity</label>
        <div className="grid grid-cols-3 gap-1.5">
          {ACTIVITIES.map((a) => (
            <button
              key={a.name}
              type="button"
              onClick={() => pickActivity(a.name)}
              className={`flex flex-col items-center gap-0.5 rounded-lg border px-1 py-2 text-[11px] font-medium transition ${
                activity === a.name
                  ? 'bg-brand/15 border-brand/40 text-brand-soft'
                  : 'bg-surface border-border text-muted hover:text-ink'
              }`}
            >
              <span className="text-base leading-none">{a.icon}</span>
              <span className="truncate w-full text-center">{a.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Duration (min)</label>
          <input
            className="input tabular-nums"
            type="number"
            min="1"
            inputMode="numeric"
            value={minutes}
            onChange={(e) => {
              setMinutes(e.target.value)
              recompute(met, e.target.value)
            }}
          />
        </div>
        <div>
          <label className="label flex items-center gap-1.5">
            <Flame size={12} className="text-amber" /> Calories burned
          </label>
          <input
            className="input tabular-nums"
            type="number"
            min="0"
            inputMode="numeric"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted">
        Net (extra) burn estimated from your {round(weightKg)} kg body weight and MET {met}. Adjust the calories if you
        tracked them on a device.
      </p>

      <button type="submit" disabled={!valid} className="btn-primary w-full">
        <Plus size={16} /> Add workout
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Workout plan
// ---------------------------------------------------------------------------

function WorkoutPlan() {
  const routines = useStore((s) => s.routines)
  const removeRoutine = useStore((s) => s.removeRoutine)
  const logRoutine = useStore((s) => s.logRoutine)
  const weights = useStore((s) => s.weights)
  const settings = useStore((s) => s.settings)
  const ai = useStore((s) => s.ai)
  const weightKg = bodyWeightKg(weights, settings)

  const [editing, setEditing] = useState<Routine | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<WorkoutDraft | null>(null)
  const [aiOpen, setAiOpen] = useState(false)

  function closeEditor() {
    setEditing(null)
    setCreating(false)
    setDraft(null)
  }

  function openDraft(d: WorkoutDraft) {
    setDraft(d)
    setCreating(true)
  }

  // build weekday → routines map (Mon-first display order)
  const order = [1, 2, 3, 4, 5, 6, 0]
  const byDay = useMemo(() => {
    const map: Record<number, Routine[]> = {}
    for (const r of routines) if (r.day !== null) (map[r.day] ??= []).push(r)
    return map
  }, [routines])

  const unscheduled = routines.filter((r) => r.day === null)

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        {aiConfigured(ai) && (
          <button onClick={() => setAiOpen(true)} className="btn-ghost">
            <Sparkles size={16} /> Generate with AI
          </button>
        )}
        <button onClick={() => setCreating(true)} className="btn-primary">
          <Plus size={16} /> New routine
        </button>
      </div>

      {/* quick-start templates */}
      <Card title="Start from a template" subtitle="Pick a split, tweak the exercises, then save it">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {WORKOUT_TEMPLATES.map((t) => (
            <button
              key={t.name}
              onClick={() =>
                openDraft({
                  name: t.name,
                  day: null,
                  activity: t.activity,
                  met: t.met,
                  durationMin: t.durationMin,
                  exercises: toPlanned(t.exercises),
                })
              }
              className="flex items-start gap-2.5 rounded-xl bg-surface border border-border px-3 py-2.5 text-left hover:border-brand/40 hover:bg-card-hover transition"
            >
              <span className="text-xl leading-none">{t.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold truncate">{t.name}</span>
                <span className="block text-[11px] text-muted truncate">{t.description}</span>
                <span className="block text-[10px] text-muted/70 mt-0.5">{t.exercises.length} exercises</span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* weekly overview */}
      <Card title="Weekly plan" subtitle="Your training split">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {order.map((d) => (
            <div key={d} className="rounded-xl bg-surface border border-border p-2 min-h-[84px]">
              <div className="text-[11px] font-semibold text-muted mb-1.5">{WEEKDAYS[d]}</div>
              {(byDay[d] ?? []).length === 0 ? (
                <div className="text-[11px] text-muted/40">Rest</div>
              ) : (
                (byDay[d] ?? []).map((r) => {
                  const act = ACTIVITIES.find((a) => a.name === r.activity)
                  return (
                    <div key={r.id} className="rounded-lg bg-brand/10 text-brand-soft text-[11px] font-medium px-2 py-1 mb-1 truncate">
                      {act?.icon} {r.name}
                    </div>
                  )
                })
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* routine cards */}
      {routines.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <CalendarDays className="mx-auto text-muted/40 mb-2" size={32} />
            <p className="text-sm font-medium">No routines yet</p>
            <p className="text-xs text-muted mt-1 mb-4">Create your training routines and assign them to weekdays.</p>
            <button onClick={() => setCreating(true)} className="btn-primary mx-auto">
              <Plus size={16} /> New routine
            </button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...routines]
            .sort((a, b) => (a.day ?? 99) - (b.day ?? 99))
            .map((r) => {
              const act = ACTIVITIES.find((a) => a.name === r.activity)
              const cals = estimateBurn(r.met, r.durationMin, weightKg)
              return (
                <div key={r.id} className="card p-5 flex flex-col animate-fade-up">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate flex items-center gap-1.5">
                        <span>{act?.icon}</span> {r.name}
                      </h3>
                      <p className="text-xs text-muted mt-0.5">
                        {r.day !== null ? WEEKDAYS_LONG[r.day] : 'Unscheduled'} · {r.durationMin} min · ~{cals} kcal
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setEditing(r)}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-surface border border-border text-muted hover:text-ink transition"
                        aria-label="Edit routine"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${r.name}"?`)) removeRoutine(r.id)
                        }}
                        className="grid h-8 w-8 place-items-center rounded-lg bg-surface border border-border text-muted hover:text-fat transition"
                        aria-label="Delete routine"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1 text-xs text-muted flex-1">
                    {r.exercises.length === 0 && <li className="text-muted/50">No exercises listed.</li>}
                    {r.exercises.slice(0, 5).map((e) => (
                      <li key={e.id} className="flex items-center gap-1.5">
                        <ListChecks size={11} className="text-brand-soft shrink-0" />
                        <span className="truncate">
                          {e.name}
                          {e.sets && e.reps ? (
                            <span className="text-muted/60"> · {e.sets}×{e.reps}</span>
                          ) : e.note ? (
                            <span className="text-muted/60"> · {e.note}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                    {r.exercises.length > 5 && <li className="text-muted/60">+{r.exercises.length - 5} more…</li>}
                  </ul>

                  <button
                    onClick={() => logRoutine(r, todayKey(), cals)}
                    className="btn-ghost w-full mt-4"
                    title="Log this routine for today"
                  >
                    <Plus size={15} /> Log today (~{cals} kcal)
                  </button>
                </div>
              )
            })}
        </div>
      )}

      {unscheduled.length > 0 && (
        <p className="text-[11px] text-muted">
          {unscheduled.length} unscheduled routine{unscheduled.length !== 1 ? 's' : ''} — assign a weekday when editing to
          see them in the weekly plan.
        </p>
      )}

      {(creating || editing) && (
        <RoutineEditor routine={editing ?? undefined} draft={draft ?? undefined} onClose={closeEditor} />
      )}

      {aiOpen && (
        <AIWorkoutDialog
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
