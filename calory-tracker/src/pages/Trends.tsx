import { useMemo, useState } from 'react'
import { useStore } from '../store/useStore'
import { addDaysKey, todayKey, shortDate } from '../lib/date'
import { totalsForDate, sumMacros, round, entriesForDate, macroCalories } from '../lib/calc'
import { Card } from '../components/ui/Card'
import { ChartTooltip } from './Dashboard'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

const RANGES = [
  { key: 7, label: '7D' },
  { key: 14, label: '14D' },
  { key: 30, label: '30D' },
  { key: 90, label: '90D' },
] as const

export function Trends() {
  const [days, setDays] = useState<number>(30)
  const foods = useStore((s) => s.foods)
  const weights = useStore((s) => s.weights)
  const settings = useStore((s) => s.settings)
  const goals = settings.goals

  const calorieData = useMemo(() => {
    return Array.from({ length: days }, (_, i) => {
      const d = addDaysKey(todayKey(), -(days - 1 - i))
      const t = totalsForDate(foods, d)
      return {
        date: shortDate(d),
        calories: round(t.calories),
        protein: round(t.protein),
        carbs: round(t.carbs),
        fat: round(t.fat),
      }
    })
  }, [foods, days])

  const loggedDays = calorieData.filter((d) => d.calories > 0)
  const avgCalories = loggedDays.length
    ? round(loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length)
    : 0
  const avgProtein = loggedDays.length
    ? round(loggedDays.reduce((s, d) => s + d.protein, 0) / loggedDays.length)
    : 0
  const onGoalDays = loggedDays.filter((d) => Math.abs(d.calories - goals.calories) <= goals.calories * 0.1).length

  // Macro distribution across the whole range (by calories)
  const rangeTotals = useMemo(() => {
    const all = calorieData.length
      ? sumMacros(
          Array.from({ length: days }, (_, i) =>
            totalsForDate(foods, addDaysKey(todayKey(), -(days - 1 - i))),
          ),
        )
      : { calories: 0, protein: 0, carbs: 0, fat: 0 }
    const cals = macroCalories(all)
    return [
      { name: 'Protein', value: round(cals.protein), color: '#38bdf8' },
      { name: 'Carbs', value: round(cals.carbs), color: '#fbbf24' },
      { name: 'Fat', value: round(cals.fat), color: '#f472b6' },
    ]
  }, [foods, calorieData, days])

  const weightData = useMemo(() => {
    const cutoff = addDaysKey(todayKey(), -(days - 1))
    return [...weights]
      .filter((w) => w.date >= cutoff)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((w) => ({ date: shortDate(w.date), weight: w.weight }))
  }, [weights, days])

  // weekday averages — when do you eat the most?
  const weekdayData = useMemo(() => {
    const buckets = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }))
    for (let i = 0; i < days; i++) {
      const key = addDaysKey(todayKey(), -i)
      const items = entriesForDate(foods, key)
      if (!items.length) continue
      const cals = sumMacros(items).calories
      const wd = new Date(key + 'T00:00:00').getDay()
      buckets[wd].sum += cals
      buckets[wd].n += 1
    }
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return names.map((name, i) => ({
      day: name,
      calories: buckets[i].n ? round(buckets[i].sum / buckets[i].n) : 0,
    }))
  }, [foods, days])

  const hasData = loggedDays.length > 0 || weightData.length > 0

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Trends &amp; Stats</h1>
          <p className="text-sm text-muted mt-1">Spot patterns and track your progress.</p>
        </div>
        <div className="flex gap-1 rounded-xl bg-surface border border-border p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setDays(r.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                days === r.key ? 'bg-brand text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {!hasData ? (
        <Card>
          <p className="text-sm text-muted text-center py-10">
            No data in this range yet. Log some food and weight — or load demo data from{' '}
            <span className="text-brand-soft">Settings</span> to explore the charts.
          </p>
        </Card>
      ) : (
        <>
          {/* summary stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Mini label="Avg calories / day" value={`${avgCalories}`} unit="kcal" sub={`goal ${goals.calories}`} />
            <Mini label="Avg protein / day" value={`${avgProtein}`} unit="g" sub={`goal ${goals.protein}g`} />
            <Mini label="Days on target" value={`${onGoalDays}`} unit={`/ ${loggedDays.length}`} sub="±10% of goal" />
          </div>

          {/* calories over time */}
          <Card title="Calories over time" subtitle="Dashed line is your daily goal">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={calorieData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#7d8b9c', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                  <YAxis tick={{ fill: '#7d8b9c', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                  <Tooltip content={<ChartTooltip unit="kcal" />} cursor={{ stroke: '#2b3a4d' }} />
                  <ReferenceLine y={goals.calories} stroke="#fbbf24" strokeDasharray="5 4" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="calories" stroke="#22c55e" strokeWidth={2.5} fill="url(#cg)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* macros stacked */}
            <Card title="Macros over time" subtitle="Grams per day, stacked">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calorieData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: '#7d8b9c', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                    <YAxis tick={{ fill: '#7d8b9c', fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<ChartTooltip unit="g" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="protein" stackId="m" fill="#38bdf8" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="carbs" stackId="m" fill="#fbbf24" />
                    <Bar dataKey="fat" stackId="m" fill="#f472b6" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* macro split donut */}
            <Card title="Calorie distribution" subtitle="Share of calories from each macro">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rangeTotals}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={3}
                      stroke="none"
                    >
                      {rangeTotals.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip unit="kcal" />} />
                    <Legend
                      verticalAlign="bottom"
                      iconType="circle"
                      formatter={(v) => <span style={{ color: '#7d8b9c', fontSize: 12 }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* weight */}
            <Card title="Weight trend" subtitle={`Target ${settings.targetWeight} ${settings.unit}`}>
              <div className="h-64">
                {weightData.length === 0 ? (
                  <div className="h-full grid place-items-center text-sm text-muted">No weigh-ins in range.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: '#7d8b9c', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={20} />
                      <YAxis domain={['auto', 'auto']} tick={{ fill: '#7d8b9c', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip content={<ChartTooltip unit={settings.unit} />} cursor={{ stroke: '#2b3a4d' }} />
                      <ReferenceLine y={settings.targetWeight} stroke="#fbbf24" strokeDasharray="5 4" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="weight" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 2.5, fill: '#4ade80', strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* weekday avg */}
            <Card title="Average by weekday" subtitle="When do you eat the most?">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" vertical={false} />
                    <XAxis dataKey="day" tick={{ fill: '#7d8b9c', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#7d8b9c', fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                    <Tooltip content={<ChartTooltip unit="kcal" />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <ReferenceLine y={goals.calories} stroke="#fbbf24" strokeDasharray="5 4" strokeWidth={1.5} />
                    <Bar dataKey="calories" radius={[5, 5, 0, 0]}>
                      {weekdayData.map((d, i) => (
                        <Cell key={i} fill={d.calories > goals.calories ? '#fbbf24' : '#22c55e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function Mini({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value} <span className="text-sm font-medium text-muted">{unit}</span>
      </div>
      {sub && <div className="text-[11px] text-muted/70 mt-0.5">{sub}</div>}
    </div>
  )
}
