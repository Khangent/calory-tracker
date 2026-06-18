import { useEffect, useMemo, useState } from 'react'
import {
  Target,
  Flame,
  Activity as ActivityIcon,
  TrendingDown,
  TrendingUp,
  Minus,
  Check,
  CalendarClock,
  AlertTriangle,
} from 'lucide-react'
import type { ActivityLevel, Sex } from '../types'
import { useStore } from '../store/useStore'
import { round, toNum } from '../lib/calc'
import { toKg } from '../lib/fitness'
import { addDaysKey, prettyDate, todayKey } from '../lib/date'
import {
  ACTIVITY_LEVELS,
  bmrMifflin,
  tdee,
  buildPlan,
  suggestMacros,
} from '../lib/nutrition'
import { Card } from '../components/ui/Card'

export function Planner() {
  const settings = useStore((s) => s.settings)
  const weights = useStore((s) => s.weights)
  const updateSettings = useStore((s) => s.updateSettings)
  const updateGoals = useStore((s) => s.updateGoals)
  const addWeight = useStore((s) => s.addWeight)
  const { unit } = settings

  const latestWeight = useMemo(
    () => [...weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.weight,
    [weights],
  )
  // single source of truth for "current weight": latest weigh-in, else the start weight from Settings
  const sourceWeight = latestWeight ?? settings.startWeight
  const [curWeight, setCurWeight] = useState(String(sourceWeight))
  const [applied, setApplied] = useState(false)

  // keep the field in sync whenever the underlying weight changes (Settings start weight or a new weigh-in)
  useEffect(() => {
    setCurWeight(String(sourceWeight))
  }, [sourceWeight])

  // persist an edited current weight as today's weigh-in so it syncs across the app
  function commitWeight() {
    const v = round(toNum(curWeight), 1)
    if (v > 0 && v !== round(sourceWeight, 1)) addWeight(todayKey(), v)
  }

  const isImperial = unit === 'lb'
  const currentKg = toKg(toNum(curWeight), unit)
  const targetKg = toKg(settings.targetWeight, unit)

  // height shown in inches for imperial users, cm otherwise
  const heightDisplay = isImperial ? round(settings.heightCm / 2.54) : settings.heightCm
  const setHeight = (v: string) => {
    const n = toNum(v)
    updateSettings({ heightCm: isImperial ? Math.round(n * 2.54) : Math.round(n) })
  }

  const bmr = bmrMifflin(currentKg, settings.heightCm, settings.age, settings.sex)
  const plan = buildPlan({
    currentKg,
    targetKg,
    heightCm: settings.heightCm,
    age: settings.age,
    sex: settings.sex,
    level: settings.activityLevel,
    weeklyRateKg: settings.weeklyRateKg,
  })
  const macros = suggestMacros(plan.targetCalories, currentKg)
  const maxFactor = ACTIVITY_LEVELS[ACTIVITY_LEVELS.length - 1].factor

  // weekly-rate presets in the user's unit
  const ratePresets = isImperial
    ? [0.5, 1, 1.5, 2].map((lb) => ({ label: `${lb} lb/wk`, kg: lb * 0.453592 }))
    : [0.25, 0.5, 0.75, 1].map((kg) => ({ label: `${kg} kg/wk`, kg }))

  const projectedDate =
    plan.weeksToGoal && plan.weeksToGoal > 0
      ? prettyDate(addDaysKey(todayKey(), Math.round(plan.weeksToGoal * 7)))
      : null

  function applyToGoals() {
    commitWeight() // make sure a freshly-typed current weight is saved too
    updateGoals({ calories: macros.calories, protein: macros.protein, carbs: macros.carbs, fat: macros.fat })
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Goal Planner</h1>
        <p className="text-sm text-muted mt-1">
          Estimate your maintenance calories and the daily target to reach your goal weight.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* inputs */}
        <Card className="lg:col-span-2" title="Your details" subtitle="Used for the Mifflin-St Jeor estimate">
          <div className="space-y-4">
            <div>
              <label className="label">Sex</label>
              <div className="flex gap-2">
                {(['male', 'female'] as Sex[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateSettings({ sex: s })}
                    className={`chip flex-1 justify-center capitalize ${settings.sex === s ? 'chip-active' : ''}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <NumField label="Age" value={settings.age} onChange={(v) => updateSettings({ age: Math.round(v) })} />
              <NumField
                label={`Height (${isImperial ? 'in' : 'cm'})`}
                value={heightDisplay}
                onChange={(v) => setHeight(String(v))}
                step={isImperial ? 0.5 : 1}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Current weight ({unit})</label>
                <input
                  className="input tabular-nums"
                  type="number"
                  min="0"
                  step="0.1"
                  inputMode="decimal"
                  value={curWeight}
                  onChange={(e) => setCurWeight(e.target.value)}
                  onBlur={commitWeight}
                />
              </div>
              <NumField
                label={`Goal weight (${unit})`}
                value={settings.targetWeight}
                step={0.1}
                onChange={(v) => updateSettings({ targetWeight: round(v, 1) })}
              />
            </div>

            <div>
              <label className="label">Activity level</label>
              <div className="space-y-1.5">
                {ACTIVITY_LEVELS.map((a) => (
                  <button
                    key={a.key}
                    onClick={() => updateSettings({ activityLevel: a.key as ActivityLevel })}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                      settings.activityLevel === a.key
                        ? 'bg-brand/15 border-brand/40'
                        : 'bg-surface border-border hover:bg-card-hover'
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-medium ${settings.activityLevel === a.key ? 'text-brand-soft' : ''}`}>
                        {a.label}
                      </span>
                      <span className="block text-[11px] text-muted truncate">{a.desc}</span>
                    </span>
                    <span className="text-xs tabular-nums text-muted">×{a.factor}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Goal pace</label>
              <div className="flex flex-wrap gap-2">
                {ratePresets.map((p) => {
                  const active = Math.abs(settings.weeklyRateKg - p.kg) < 0.02
                  return (
                    <button
                      key={p.label}
                      onClick={() => updateSettings({ weeklyRateKg: p.kg })}
                      className={`chip ${active ? 'chip-active' : ''}`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* results */}
        <div className="lg:col-span-3 space-y-6">
          {/* headline numbers */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="BMR" value={bmr} hint="at rest" icon={Flame} accent="#7d8b9c" />
            <Metric label="Maintenance" value={plan.maintenance} hint={`${ACTIVITY_LEVELS.find((a) => a.key === settings.activityLevel)?.label}`} icon={ActivityIcon} accent="#fbbf24" />
            <Metric
              label="Your target"
              value={plan.targetCalories}
              hint={
                plan.direction === 'maintain'
                  ? 'to maintain'
                  : `${plan.dailyAdjustment > 0 ? '+' : ''}${round(plan.dailyAdjustment)} kcal/day`
              }
              icon={plan.direction === 'lose' ? TrendingDown : plan.direction === 'gain' ? TrendingUp : Minus}
              accent="#22c55e"
              highlight
            />
          </div>

          {/* activity breakdown */}
          <Card title="How activity changes your calories" subtitle="Maintenance calories at each activity level">
            <div className="space-y-2.5">
              {ACTIVITY_LEVELS.map((a) => {
                const cals = tdee(bmr, a.key)
                const delta = cals - plan.maintenance
                const selected = a.key === settings.activityLevel
                return (
                  <div key={a.key} className="flex items-center gap-3">
                    <span className={`w-28 shrink-0 text-xs ${selected ? 'text-brand-soft font-semibold' : 'text-muted'}`}>
                      {a.label}
                    </span>
                    <div className="flex-1 h-7 rounded-lg bg-surface overflow-hidden relative">
                      <div
                        className="h-full rounded-lg transition-[width] duration-500"
                        style={{
                          width: `${(a.factor / maxFactor) * 100}%`,
                          background: selected ? '#22c55e' : '#1f2a37',
                        }}
                      />
                      <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold tabular-nums">
                        {cals} kcal
                      </span>
                    </div>
                    <span
                      className={`w-16 shrink-0 text-right text-xs tabular-nums ${
                        delta === 0 ? 'text-muted' : delta > 0 ? 'text-brand-soft' : 'text-amber'
                      }`}
                    >
                      {delta === 0 ? '—' : `${delta > 0 ? '+' : ''}${delta}`}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-muted mt-3">
              Numbers on the right show the difference versus your selected level
              ({ACTIVITY_LEVELS.find((a) => a.key === settings.activityLevel)?.label}).
            </p>
          </Card>

          {/* goal summary */}
          <Card title="Reaching your goal">
            {plan.direction === 'maintain' ? (
              <p className="text-sm text-muted">
                You're at your goal weight — eat around <strong className="text-ink">{plan.targetCalories} kcal</strong> per
                day to maintain.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted">
                  To {plan.direction}{' '}
                  <strong className="text-ink">
                    {round(Math.abs(toNum(curWeight) - settings.targetWeight), 1)} {unit}
                  </strong>{' '}
                  ({toNum(curWeight)} → {settings.targetWeight} {unit}), eat about{' '}
                  <strong className="text-brand-soft">{plan.targetCalories} kcal/day</strong> — a{' '}
                  {plan.dailyAdjustment > 0 ? 'surplus' : 'deficit'} of{' '}
                  <strong className="text-ink">{round(Math.abs(plan.dailyAdjustment))} kcal</strong>.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Pill icon={CalendarClock} label="Est. time" value={plan.weeksToGoal ? `${round(plan.weeksToGoal)} weeks` : '—'} />
                  <Pill icon={Target} label="Target date" value={projectedDate ?? '—'} />
                  <Pill
                    icon={plan.direction === 'lose' ? TrendingDown : TrendingUp}
                    label="Actual pace"
                    value={`${round(Math.abs(plan.effectiveWeeklyKg) * (isImperial ? 2.2046 : 1), 2)} ${unit}/wk`}
                  />
                </div>
                {plan.clamped && (
                  <div className="flex items-start gap-2 rounded-xl bg-amber/10 border border-amber/30 px-3 py-2.5 text-xs text-amber">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    Your chosen pace would drop intake below a safe level, so we raised it to{' '}
                    {plan.targetCalories} kcal. Reaching your goal will take a little longer.
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* suggested macros + apply */}
          <Card title="Suggested daily goals" subtitle="Based on your target calories (1.8 g/kg protein, 25% fat)">
            <div className="grid grid-cols-4 gap-2 text-center mb-4">
              <MacroBox label="Calories" value={macros.calories} unit="kcal" color="#22c55e" />
              <MacroBox label="Protein" value={macros.protein} unit="g" color="#38bdf8" />
              <MacroBox label="Carbs" value={macros.carbs} unit="g" color="#fbbf24" />
              <MacroBox label="Fat" value={macros.fat} unit="g" color="#f472b6" />
            </div>
            <button onClick={applyToGoals} className="btn-primary w-full">
              {applied ? <Check size={16} /> : <Target size={16} />}
              {applied ? 'Applied to your daily goals' : 'Apply to my daily goals'}
            </button>
            <p className="text-[11px] text-muted mt-2 text-center">
              Estimates only — adjust to how your body actually responds over a few weeks.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}

function NumField({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        className="input tabular-nums"
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(toNum(e.target.value))}
      />
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  accent,
  highlight,
}: {
  label: string
  value: number
  hint?: string
  icon: typeof Flame
  accent: string
  highlight?: boolean
}) {
  return (
    <div className={`card p-4 ${highlight ? 'ring-1 ring-brand/30' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: `${accent}1f`, color: accent }}>
          <Icon size={14} />
        </span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[11px] text-muted truncate">{hint}</div>
    </div>
  )
}

function Pill({ icon: Icon, label, value }: { icon: typeof Flame; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface border border-border px-3 py-2">
      <Icon size={15} className="text-brand-soft" />
      <div>
        <div className="text-[10px] text-muted leading-none">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  )
}

function MacroBox({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="rounded-xl bg-surface border border-border py-2.5">
      <div className="text-lg font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-muted">
        {label} ({unit})
      </div>
    </div>
  )
}
