import { useMemo, useState } from 'react'
import { Flame, Beef, Wheat, Scale, TrendingDown, Sparkles, Dumbbell } from 'lucide-react'
import type { Tab } from '../App'
import { useStore } from '../store/useStore'
import { todayKey, shortDate, addDaysKey } from '../lib/date'
import { totalsForDate, pct, round, macroCalories } from '../lib/calc'
import { caloriesBurnedForDate, kcalFromSteps, bodyWeightKg } from '../lib/fitness'
import { Card } from '../components/ui/Card'
import { AICoachCard } from '../components/AICoachCard'
import { ProgressRing } from '../components/ui/ProgressRing'
import { MacroBar } from '../components/ui/MacroBar'
import { StatCard } from '../components/ui/StatCard'
import { DateNav } from '../components/DateNav'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

export function Dashboard({ onNavigate }: { onNavigate: (t: Tab) => void }) {
  const [date, setDate] = useState(todayKey())
  const foods = useStore((s) => s.foods)
  const weights = useStore((s) => s.weights)
  const workouts = useStore((s) => s.workouts)
  const steps = useStore((s) => s.steps)
  const settings = useStore((s) => s.settings)
  const goals = settings.goals

  const totals = useMemo(() => totalsForDate(foods, date), [foods, date])
  const burned = useMemo(() => {
    const weightKg = bodyWeightKg(weights, settings)
    return caloriesBurnedForDate(workouts, date) + kcalFromSteps(steps[date] ?? 0, weightKg)
  }, [workouts, steps, weights, settings, date])
  // Exercise tops up the daily allowance when enabled.
  const budget = goals.calories + (settings.addExerciseToBudget ? burned : 0)
  const remaining = Math.max(0, budget - totals.calories)
  const over = totals.calories > budget

  // 7-day calories series ending on selected date
  const series = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDaysKey(date, -(6 - i))
      return { date: shortDate(d), calories: round(totalsForDate(foods, d).calories) }
    })
  }, [foods, date])

  const sortedWeights = useMemo(
    () => [...weights].sort((a, b) => a.date.localeCompare(b.date)),
    [weights],
  )
  const latestWeight = sortedWeights.at(-1)
  const firstWeight = sortedWeights[0]
  const weightDelta = latestWeight && firstWeight ? latestWeight.weight - firstWeight.weight : 0

  const cals = macroCalories(totals)
  const macroSplitTotal = cals.protein + cals.carbs + cals.fat || 1

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            {greeting()}{settings.name ? `, ${settings.name}` : ''} 👋
          </h1>
          <p className="text-sm text-muted mt-1">Here's your nutrition snapshot.</p>
        </div>
        <DateNav date={date} onChange={setDate} />
      </header>

      {/* Top grid: calorie ring + macros */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center">
          <ProgressRing value={pct(totals.calories, budget)} color={over ? '#fbbf24' : '#22c55e'}>
            <div className="space-y-0.5">
              <div className="text-3xl font-extrabold tabular-nums leading-none">
                {round(totals.calories)}
              </div>
              <div className="text-[11px] text-muted">of {round(budget)} kcal</div>
              <div className={`text-xs font-semibold mt-1 ${over ? 'text-amber' : 'text-brand-soft'}`}>
                {over ? `${round(totals.calories - budget)} over` : `${round(remaining)} left`}
              </div>
            </div>
          </ProgressRing>
          <div className="mt-4 flex flex-col items-center gap-1 text-xs text-muted">
            <span className="flex items-center gap-2">
              <Flame size={14} className="text-brand-soft" />
              {pct(totals.calories, budget)}% of {settings.addExerciseToBudget && burned > 0 ? 'adjusted budget' : 'daily goal'}
            </span>
            {settings.addExerciseToBudget && burned > 0 && (
              <span className="flex items-center gap-1 text-amber">
                <Dumbbell size={12} /> +{round(burned)} kcal from activity
              </span>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-2" title="Macronutrients" subtitle="Grams vs. your daily targets">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-4">
              <MacroBar label="Protein" value={totals.protein} goal={goals.protein} color="#38bdf8" />
              <MacroBar label="Carbs" value={totals.carbs} goal={goals.carbs} color="#fbbf24" />
              <MacroBar label="Fat" value={totals.fat} goal={goals.fat} color="#f472b6" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs text-muted mb-3">Calorie split by macro</p>
              <div className="flex h-4 w-full overflow-hidden rounded-full bg-surface">
                <Seg w={(cals.protein / macroSplitTotal) * 100} color="#38bdf8" />
                <Seg w={(cals.carbs / macroSplitTotal) * 100} color="#fbbf24" />
                <Seg w={(cals.fat / macroSplitTotal) * 100} color="#f472b6" />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
                <Legend color="#38bdf8" label="Protein" pct={(cals.protein / macroSplitTotal) * 100} />
                <Legend color="#fbbf24" label="Carbs" pct={(cals.carbs / macroSplitTotal) * 100} />
                <Legend color="#f472b6" label="Fat" pct={(cals.fat / macroSplitTotal) * 100} />
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Calories today" value={`${round(totals.calories)}`} hint="kcal logged" icon={Flame} accent="#22c55e" />
        <StatCard label="Protein today" value={`${round(totals.protein)} g`} hint={`${pct(totals.protein, goals.protein)}% of goal`} icon={Beef} accent="#38bdf8" />
        <StatCard label="Carbs today" value={`${round(totals.carbs)} g`} hint={`${pct(totals.carbs, goals.carbs)}% of goal`} icon={Wheat} accent="#fbbf24" />
        <StatCard
          label="Current weight"
          value={latestWeight ? `${latestWeight.weight} ${settings.unit}` : '—'}
          icon={latestWeight ? TrendingDown : Scale}
          accent="#4ade80"
          trend={
            latestWeight && firstWeight && weightDelta !== 0
              ? {
                  dir: weightDelta < 0 ? 'down' : 'up',
                  text: `${weightDelta > 0 ? '+' : ''}${round(weightDelta, 1)} ${settings.unit}`,
                  good: settings.targetWeight <= settings.startWeight ? weightDelta < 0 : weightDelta > 0,
                }
              : undefined
          }
        />
      </div>

      {/* Weekly trend */}
      <Card
        title="Last 7 days"
        subtitle="Daily calories vs. goal"
        action={
          <button onClick={() => onNavigate('trends')} className="text-xs font-semibold text-brand-soft hover:underline">
            View all trends →
          </button>
        }
      >
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#7d8b9c', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7d8b9c', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<ChartTooltip unit="kcal" />} cursor={{ stroke: '#2b3a4d' }} />
              <ReferenceLine y={goals.calories} stroke="#fbbf24" strokeDasharray="5 4" strokeWidth={1.5} />
              <Area type="monotone" dataKey="calories" stroke="#22c55e" strokeWidth={2.5} fill="url(#calGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <AICoachCard />

      <div className="flex flex-wrap gap-3">
        <button onClick={() => onNavigate('food')} className="btn-primary">
          <Sparkles size={16} /> Log food
        </button>
        <button onClick={() => onNavigate('weight')} className="btn-ghost">
          <Scale size={16} /> Log weight
        </button>
      </div>
    </div>
  )
}

function Seg({ w, color }: { w: number; color: string }) {
  return <div style={{ width: `${w}%`, background: color }} className="h-full transition-[width] duration-700" />
}

function Legend({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label} {round(pct)}%
    </span>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export function ChartTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-card text-xs">
      <div className="font-semibold text-ink mb-1">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.stroke }} />
          <span className="capitalize">{p.name}:</span>
          <span className="text-ink font-medium tabular-nums">
            {round(p.value, 1)} {unit}
          </span>
        </div>
      ))}
    </div>
  )
}
