import { useState } from 'react'
import { Sparkles, Loader2, RefreshCw, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Card } from './ui/Card'
import { MiniMarkdown } from './ui/MiniMarkdown'
import { aiConfigured, getInsights } from '../lib/ai'
import { addDaysKey, todayKey } from '../lib/date'
import { totalsForDate, round } from '../lib/calc'

/** Build a compact text summary of recent tracking data for the coach. */
function buildSummary(
  foods: ReturnType<typeof useStore.getState>['foods'],
  weights: ReturnType<typeof useStore.getState>['weights'],
  settings: ReturnType<typeof useStore.getState>['settings'],
): string {
  const days = 14
  let loggedDays = 0
  let cal = 0
  let p = 0
  let c = 0
  let f = 0
  for (let i = 0; i < days; i++) {
    const t = totalsForDate(foods, addDaysKey(todayKey(), -i))
    if (t.calories > 0) {
      loggedDays++
      cal += t.calories
      p += t.protein
      c += t.carbs
      f += t.fat
    }
  }
  const g = settings.goals
  const lines: string[] = []
  lines.push(`Daily goals: ${g.calories} kcal, ${g.protein}g protein, ${g.carbs}g carbs, ${g.fat}g fat.`)
  if (loggedDays > 0) {
    lines.push(
      `Last ${days} days (${loggedDays} logged): avg ${round(cal / loggedDays)} kcal, ` +
        `${round(p / loggedDays)}g protein, ${round(c / loggedDays)}g carbs, ${round(f / loggedDays)}g fat per day.`,
    )
  } else {
    lines.push('No food logged in the last 14 days.')
  }

  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length >= 2) {
    const first = sorted[0]
    const last = sorted[sorted.length - 1]
    lines.push(
      `Weight: ${last.weight}${settings.unit} now, ${round(last.weight - first.weight, 1)}${settings.unit} change over ${sorted.length} weigh-ins. ` +
        `Target ${settings.targetWeight}${settings.unit}.`,
    )
  } else if (sorted.length === 1) {
    lines.push(`Weight: ${sorted[0].weight}${settings.unit}. Target ${settings.targetWeight}${settings.unit}.`)
  }
  return lines.join('\n')
}

export function AICoachCard() {
  const ai = useStore((s) => s.ai)
  const foods = useStore((s) => s.foods)
  const weights = useStore((s) => s.weights)
  const settings = useStore((s) => s.settings)

  const [loading, setLoading] = useState(false)
  const [insight, setInsight] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!aiConfigured(ai)) return null

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const summary = buildSummary(foods, weights, settings)
      const text = await getInsights(ai, summary)
      setInsight(text)
    } catch (e: any) {
      setError(e?.message ?? 'Could not generate insights.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title="AI coach"
      subtitle="Personalized insights from your data"
      action={
        insight && (
          <button onClick={run} disabled={loading} className="text-xs font-semibold text-brand-soft hover:underline flex items-center gap-1">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        )
      }
    >
      {!insight && !error && (
        <div className="text-center py-6">
          <span className="grid h-12 w-12 mx-auto place-items-center rounded-2xl bg-brand/15 text-brand-soft mb-3">
            <Sparkles size={22} />
          </span>
          <p className="text-sm text-muted mb-4">
            Get a quick read on your recent calories, macros and weight trend.
          </p>
          <button onClick={run} disabled={loading} className="btn-primary mx-auto">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Thinking…' : 'Analyze my progress'}
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-surface border border-border px-3 py-2.5 text-xs text-muted">
          <AlertCircle size={14} className="text-amber mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {insight && <MiniMarkdown text={insight} />}
    </Card>
  )
}
