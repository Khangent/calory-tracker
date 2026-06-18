import { useState } from 'react'
import { Save, Database, Trash2, Download, Upload, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { WeightUnit } from '../types'
import { Card } from '../components/ui/Card'
import { AISettingsCard } from '../components/AISettingsCard'
import { toNum, round, macroCalories } from '../lib/calc'

export function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const updateSettings = useStore((s) => s.updateSettings)
  const updateGoals = useStore((s) => s.updateGoals)
  const loadDemoData = useStore((s) => s.loadDemoData)
  const resetAll = useStore((s) => s.resetAll)

  const [saved, setSaved] = useState(false)
  const g = settings.goals
  const macroKcal = macroCalories(g)
  const macroTotal = round(macroKcal.protein + macroKcal.carbs + macroKcal.fat)

  function flash() {
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function exportData() {
    const state = useStore.getState()
    const blob = new Blob(
      [
        JSON.stringify(
          {
            foods: state.foods,
            weights: state.weights,
            savedFoods: state.savedFoods,
            recipes: state.recipes,
            workouts: state.workouts,
            routines: state.routines,
            steps: state.steps,
            settings: state.settings,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `calory-tracker-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importData(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result))
        useStore.setState((s) => ({
          foods: Array.isArray(data.foods) ? data.foods : s.foods,
          weights: Array.isArray(data.weights) ? data.weights : s.weights,
          savedFoods: Array.isArray(data.savedFoods) ? data.savedFoods : s.savedFoods,
          recipes: Array.isArray(data.recipes) ? data.recipes : s.recipes,
          workouts: Array.isArray(data.workouts) ? data.workouts : s.workouts,
          routines: Array.isArray(data.routines) ? data.routines : s.routines,
          steps: data.steps && typeof data.steps === 'object' ? data.steps : s.steps,
          settings: data.settings ?? s.settings,
        }))
        flash()
      } catch {
        alert('Could not read that file — is it a valid Calory Tracker export?')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-muted mt-1">Goals, profile, and your data.</p>
      </header>

      <Card title="Profile">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Display name</label>
            <input
              className="input"
              placeholder="Your name"
              value={settings.name}
              onChange={(e) => updateSettings({ name: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Weight unit</label>
            <div className="flex gap-2">
              {(['kg', 'lb'] as WeightUnit[]).map((u) => (
                <button
                  key={u}
                  onClick={() => updateSettings({ unit: u })}
                  className={`chip flex-1 justify-center ${settings.unit === u ? 'chip-active' : ''}`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card title="Daily goals" subtitle={`Macros total ≈ ${macroTotal} kcal`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label="Calories (kcal)" value={g.calories} onChange={(v) => updateGoals({ calories: v })} accent="#22c55e" />
          <NumberField label="Protein (g)" value={g.protein} onChange={(v) => updateGoals({ protein: v })} accent="#38bdf8" />
          <NumberField label="Carbs (g)" value={g.carbs} onChange={(v) => updateGoals({ carbs: v })} accent="#fbbf24" />
          <NumberField label="Fat (g)" value={g.fat} onChange={(v) => updateGoals({ fat: v })} accent="#f472b6" />
        </div>
        {Math.abs(macroTotal - g.calories) > 75 && (
          <p className="text-[11px] text-amber mt-3">
            Heads up: your macro targets total {macroTotal} kcal, which differs from your {g.calories} kcal goal.
          </p>
        )}

        <label className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-surface border border-border px-3 py-2.5 cursor-pointer select-none">
          <span className="text-sm">
            Add exercise calories to my budget
            <span className="block text-[11px] text-muted">
              Calories burned in workouts increase your daily calorie allowance.
            </span>
          </span>
          <input
            type="checkbox"
            checked={settings.addExerciseToBudget}
            onChange={(e) => updateSettings({ addExerciseToBudget: e.target.checked })}
            className="accent-brand h-5 w-5 shrink-0"
          />
        </label>
      </Card>

      <AISettingsCard />

      <Card title="Food database" subtitle="USDA FoodData Central — used by food search">
        <label className="label">USDA API key (optional)</label>
        <input
          className="input font-mono"
          placeholder="DEMO_KEY (shared, rate-limited)"
          value={settings.usdaApiKey}
          autoComplete="off"
          onChange={(e) => updateSettings({ usdaApiKey: e.target.value.trim() })}
        />
        <p className="text-[11px] text-muted mt-1.5">
          Leave blank to use a shared demo key (limited to a few searches per hour). Get a free personal key in
          seconds at{' '}
          <a
            href="https://fdc.nal.usda.gov/api-key-signup.html"
            target="_blank"
            rel="noreferrer"
            className="text-brand-soft hover:underline"
          >
            fdc.nal.usda.gov
          </a>{' '}
          for unlimited use. Stored only in this browser.
        </p>
      </Card>

      <Card title="Weight goals">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField label={`Start weight (${settings.unit})`} value={settings.startWeight} step={0.1} onChange={(v) => updateSettings({ startWeight: v })} />
          <NumberField label={`Target weight (${settings.unit})`} value={settings.targetWeight} step={0.1} onChange={(v) => updateSettings({ targetWeight: v })} />
        </div>
      </Card>

      <Card title="Your data" subtitle="Everything is stored locally in this browser">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { loadDemoData(); flash() }} className="btn-ghost">
            <Database size={16} /> Load demo data
          </button>
          <button onClick={exportData} className="btn-ghost">
            <Download size={16} /> Export JSON
          </button>
          <label className="btn-ghost cursor-pointer">
            <Upload size={16} /> Import JSON
            <input type="file" accept="application/json" className="hidden" onChange={importData} />
          </label>
          <button
            onClick={() => {
              if (confirm('Delete all foods, weights and reset settings? This cannot be undone.')) resetAll()
            }}
            className="btn bg-fat/15 text-fat border border-fat/30 hover:bg-fat/25"
          >
            <Trash2 size={16} /> Reset everything
          </button>
        </div>
        {saved && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-soft">
            <Check size={14} /> Saved
          </p>
        )}
      </Card>

      <div className="flex justify-end">
        <button onClick={flash} className="btn-primary">
          <Save size={16} /> Done
        </button>
      </div>
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  accent,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  accent?: string
  step?: number
}) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        {accent && <span className="h-2 w-2 rounded-full" style={{ background: accent }} />}
        {label}
      </label>
      <input
        className="input tabular-nums"
        type="number"
        min="0"
        step={step}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(step < 1 ? round(toNum(e.target.value), 1) : Math.round(toNum(e.target.value)))}
      />
    </div>
  )
}
