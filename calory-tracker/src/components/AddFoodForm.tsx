import { useState } from 'react'
import { Plus, Save } from 'lucide-react'
import type { MealType } from '../types'
import { MEALS } from '../types'
import { useStore } from '../store/useStore'
import { toNum, macroCalories, round } from '../lib/calc'

interface AddFoodFormProps {
  date: string
  defaultMeal?: MealType
  onAdded?: () => void
}

export function AddFoodForm({ date, defaultMeal = 'breakfast', onAdded }: AddFoodFormProps) {
  const addFood = useStore((s) => s.addFood)
  const addSavedFood = useStore((s) => s.addSavedFood)

  const [name, setName] = useState('')
  const [meal, setMeal] = useState<MealType>(defaultMeal)
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [alsoSave, setAlsoSave] = useState(false)

  // Live "calories from macros" estimate to help users sanity-check input.
  const est = macroCalories({
    calories: 0,
    protein: toNum(protein),
    carbs: toNum(carbs),
    fat: toNum(fat),
  })
  const estTotal = round(est.protein + est.carbs + est.fat)

  const valid = name.trim() !== '' && toNum(calories) > 0

  function reset() {
    setName('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setAlsoSave(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    const macros = {
      calories: toNum(calories),
      protein: toNum(protein),
      carbs: toNum(carbs),
      fat: toNum(fat),
    }
    addFood({ date, meal, name: name.trim(), ...macros })
    if (alsoSave) addSavedFood({ name: name.trim(), ...macros })
    reset()
    onAdded?.()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Food name</label>
        <input
          className="input"
          placeholder="e.g. Chicken & rice bowl"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Meal</label>
        <div className="flex flex-wrap gap-2">
          {MEALS.map((m) => (
            <button
              type="button"
              key={m.key}
              onClick={() => setMeal(m.key)}
              className={`chip ${meal === m.key ? 'chip-active' : ''}`}
            >
              <span>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Calories" unit="kcal" value={calories} onChange={setCalories} accent="#22c55e" />
        <Field label="Protein" unit="g" value={protein} onChange={setProtein} accent="#38bdf8" />
        <Field label="Carbs" unit="g" value={carbs} onChange={setCarbs} accent="#fbbf24" />
        <Field label="Fat" unit="g" value={fat} onChange={setFat} accent="#f472b6" />
      </div>

      {estTotal > 0 && (
        <p className="text-[11px] text-muted">
          Macros add up to ~<span className="text-ink font-medium">{estTotal} kcal</span>
          {toNum(calories) > 0 && Math.abs(estTotal - toNum(calories)) > 50 && (
            <span className="text-amber"> · differs from entered calories</span>
          )}
        </p>
      )}

      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
        <input
          type="checkbox"
          checked={alsoSave}
          onChange={(e) => setAlsoSave(e.target.checked)}
          className="accent-brand h-4 w-4"
        />
        <Save size={13} /> Save to my foods for quick re-logging
      </label>

      <button type="submit" className="btn-primary w-full" disabled={!valid}>
        <Plus size={16} /> Add to log
      </button>
    </form>
  )
}

function Field({
  label,
  unit,
  value,
  onChange,
  accent,
}: {
  label: string
  unit: string
  value: string
  onChange: (v: string) => void
  accent: string
}) {
  return (
    <div>
      <label className="label flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        {label} <span className="text-muted/60">({unit})</span>
      </label>
      <input
        className="input tabular-nums"
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        placeholder="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
