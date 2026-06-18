import { useMemo, useState } from 'react'
import { Scale, Trash2, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { todayKey, shortDate, prettyDate } from '../lib/date'
import { round, toNum } from '../lib/calc'
import { Card } from '../components/ui/Card'
import { StatCard } from '../components/ui/StatCard'
import { ChartTooltip } from './Dashboard'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'

export function WeightPage() {
  const weights = useStore((s) => s.weights)
  const addWeight = useStore((s) => s.addWeight)
  const removeWeight = useStore((s) => s.removeWeight)
  const settings = useStore((s) => s.settings)
  const { unit, targetWeight, startWeight } = settings

  const [date, setDate] = useState(todayKey())
  const [value, setValue] = useState('')

  const sorted = useMemo(() => [...weights].sort((a, b) => a.date.localeCompare(b.date)), [weights])
  const series = sorted.map((w) => ({ date: shortDate(w.date), weight: w.weight }))

  const latest = sorted.at(-1)
  const first = sorted[0]
  const totalChange = latest && first ? latest.weight - first.weight : 0
  const toGoal = latest ? latest.weight - targetWeight : 0
  const losing = targetWeight <= startWeight

  // progress toward target (0..100)
  const progress =
    Math.abs(startWeight - targetWeight) > 0 && latest
      ? Math.max(
          0,
          Math.min(100, ((startWeight - latest.weight) / (startWeight - targetWeight)) * 100),
        )
      : 0

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const w = toNum(value)
    if (w <= 0) return
    addWeight(date, round(w, 1))
    setValue('')
  }

  const domain = useMemo(() => {
    const vals = [...sorted.map((w) => w.weight), targetWeight]
    const min = Math.min(...vals)
    const max = Math.max(...vals)
    const pad = Math.max(1, (max - min) * 0.15)
    return [round(min - pad, 1), round(max + pad, 1)]
  }, [sorted, targetWeight])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Weight</h1>
        <p className="text-sm text-muted mt-1">Track your body weight over time.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Current"
          value={latest ? `${latest.weight} ${unit}` : '—'}
          hint={latest ? prettyDate(latest.date) : 'no entries'}
          icon={Scale}
          accent="#4ade80"
        />
        <StatCard
          label="Total change"
          value={`${totalChange > 0 ? '+' : ''}${round(totalChange, 1)} ${unit}`}
          hint="since first entry"
          icon={totalChange <= 0 ? TrendingDown : TrendingUp}
          accent="#22c55e"
          trend={
            latest && first
              ? { dir: totalChange < 0 ? 'down' : 'up', text: `${round(progress)}% to goal`, good: losing ? totalChange < 0 : totalChange > 0 }
              : undefined
          }
        />
        <StatCard
          label="To target"
          value={latest ? `${round(Math.abs(toGoal), 1)} ${unit}` : '—'}
          hint={`target ${targetWeight} ${unit}`}
          icon={Target}
          accent="#fbbf24"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2" title="Weight trend" subtitle={`Goal line at ${targetWeight} ${unit}`}>
          {series.length === 0 ? (
            <Empty />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2a37" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: '#7d8b9c', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={domain}
                    tick={{ fill: '#7d8b9c', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: '#2b3a4d' }} />
                  <ReferenceLine y={targetWeight} stroke="#fbbf24" strokeDasharray="5 4" strokeWidth={1.5} />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#22c55e', strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title="Log weight" subtitle="One entry per day (overwrites)">
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div>
                <label className="label">Weight ({unit})</label>
                <input
                  className="input tabular-nums"
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  placeholder="e.g. 78.4"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={toNum(value) <= 0}>
                <Scale size={16} /> Save weight
              </button>
            </form>
          </Card>
        </div>
      </div>

      {sorted.length > 0 && (
        <Card title="History">
          <ul className="divide-y divide-border/70">
            {[...sorted].reverse().map((w, i, arr) => {
              const prev = arr[i + 1]
              const diff = prev ? w.weight - prev.weight : 0
              return (
                <li key={w.id} className="flex items-center gap-3 py-2.5 group">
                  <span className="text-sm text-muted w-28">{prettyDate(w.date)}</span>
                  <span className="text-sm font-semibold tabular-nums">{w.weight} {unit}</span>
                  {prev && diff !== 0 && (
                    <span className={`text-xs tabular-nums ${diff < 0 ? 'text-brand-soft' : 'text-amber'}`}>
                      {diff > 0 ? '+' : ''}{round(diff, 1)}
                    </span>
                  )}
                  <button
                    onClick={() => removeWeight(w.id)}
                    className="ml-auto text-muted/50 hover:text-fat transition opacity-0 group-hover:opacity-100"
                    aria-label="Delete weight entry"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      )}
    </div>
  )
}

function Empty() {
  return (
    <div className="h-72 grid place-items-center text-center">
      <div>
        <Scale className="mx-auto text-muted/40 mb-2" size={32} />
        <p className="text-sm text-muted">No weight entries yet.</p>
        <p className="text-xs text-muted/60">Log your first weigh-in to see the trend.</p>
      </div>
    </div>
  )
}
