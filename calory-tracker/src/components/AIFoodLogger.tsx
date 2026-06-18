import { useRef, useState } from 'react'
import { Sparkles, Loader2, Plus, Trash2, AlertCircle, Wand2, Camera, X } from 'lucide-react'
import type { MealType } from '../types'
import { MEALS } from '../types'
import { useStore } from '../store/useStore'
import { aiConfigured, parseFoodText, estimateFoodFromImage, type ParsedFoodItem } from '../lib/ai'
import { fileToDataURL } from '../lib/image'

const EXAMPLES = [
  'A bowl of porridge with blueberries and a flat white',
  'Chicken caesar salad and a coke for lunch',
  '2 scrambled eggs, 2 toast with butter, orange juice',
]

export function AIFoodLogger({
  date,
  defaultMeal: initialMeal = 'lunch',
  onAdded,
}: {
  date: string
  defaultMeal?: MealType
  onAdded?: () => void
}) {
  const ai = useStore((s) => s.ai)
  const addFood = useStore((s) => s.addFood)
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [defaultMeal, setDefaultMeal] = useState<MealType>(initialMeal)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<ParsedFoodItem[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!aiConfigured(ai)) return <NotConfigured />

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    try {
      setError(null)
      setImage(await fileToDataURL(file))
    } catch (err: any) {
      setError(err?.message ?? 'Could not read that image.')
    }
  }

  async function run() {
    if (!text.trim() && !image) return
    setLoading(true)
    setError(null)
    setItems(null)
    try {
      const parsed = image
        ? await estimateFoodFromImage(ai, image, text, defaultMeal)
        : await parseFoodText(ai, text.trim(), defaultMeal)
      if (parsed.length === 0) {
        setError(image ? "Couldn't identify foods in the photo — try a clearer shot or add a note." : 'No foods recognised — try adding more detail.')
      } else {
        setItems(parsed)
      }
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  function patch(i: number, p: Partial<ParsedFoodItem>) {
    setItems((prev) => (prev ? prev.map((it, idx) => (idx === i ? { ...it, ...p } : it)) : prev))
  }

  function addAll() {
    if (!items) return
    for (const it of items) {
      addFood({
        date,
        meal: it.meal,
        name: it.name,
        calories: it.calories,
        protein: it.protein,
        carbs: it.carbs,
        fat: it.fat,
      })
    }
    setItems(null)
    setText('')
    setImage(null)
    onAdded?.()
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">{image ? 'Add a note (optional)' : 'Describe what you ate'}</label>
        <textarea
          className="input min-h-[72px] resize-y"
          placeholder={
            image
              ? 'Anything the photo misses, e.g. "cooked in 1 tbsp oil", portion sizes…'
              : 'e.g. grilled salmon with rice and broccoli, and a glass of orange juice'
          }
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {!image && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setText(ex)} className="chip text-[11px]">
                {ex.length > 34 ? ex.slice(0, 32) + '…' : ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* photo */}
      <div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickPhoto} />
        {image ? (
          <div className="relative inline-block">
            <img src={image} alt="Meal" className="h-32 w-full sm:w-auto rounded-xl object-cover border border-border" />
            <button
              onClick={() => setImage(null)}
              className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-lg bg-black/60 text-white hover:bg-black/80 transition"
              aria-label="Remove photo"
            >
              <X size={15} />
            </button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="btn-ghost w-full">
            <Camera size={16} /> Add a meal photo
          </button>
        )}
      </div>

      <div>
        <label className="label">Default meal (if unclear)</label>
        <div className="flex flex-wrap gap-2">
          {MEALS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setDefaultMeal(m.key)}
              className={`chip ${defaultMeal === m.key ? 'chip-active' : ''}`}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>
      </div>

      <button onClick={run} disabled={loading || (!text.trim() && !image)} className="btn-primary w-full">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
        {loading ? 'Analysing…' : image ? 'Estimate from photo' : 'Parse with AI'}
      </button>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-surface border border-border px-3 py-2.5 text-xs text-muted">
          <AlertCircle size={14} className="text-amber mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {items && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-soft flex items-center gap-1.5">
              <Sparkles size={13} /> {items.length} item{items.length !== 1 ? 's' : ''} — review &amp; edit
            </span>
            <span className="text-[11px] text-muted">AI estimates — tweak if needed</span>
          </div>
          <ul className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="rounded-xl bg-surface border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    className="input flex-1 py-1.5"
                    value={it.name}
                    onChange={(e) => patch(i, { name: e.target.value })}
                  />
                  <button
                    onClick={() => setItems((prev) => prev?.filter((_, idx) => idx !== i) ?? null)}
                    className="text-muted/50 hover:text-fat transition shrink-0"
                    aria-label="Remove item"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {MEALS.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => patch(i, { meal: m.key })}
                      className={`chip text-[11px] ${it.meal === m.key ? 'chip-active' : ''}`}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <NumCell label="kcal" value={it.calories} onChange={(v) => patch(i, { calories: v })} color="#22c55e" />
                  <NumCell label="P" value={it.protein} onChange={(v) => patch(i, { protein: v })} color="#38bdf8" />
                  <NumCell label="C" value={it.carbs} onChange={(v) => patch(i, { carbs: v })} color="#fbbf24" />
                  <NumCell label="F" value={it.fat} onChange={(v) => patch(i, { fat: v })} color="#f472b6" />
                </div>
              </li>
            ))}
          </ul>
          <button onClick={addAll} className="btn-primary w-full">
            <Plus size={16} /> Add {items.length} to log
          </button>
        </div>
      )}
    </div>
  )
}

function NumCell({
  label,
  value,
  onChange,
  color,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  color: string
}) {
  return (
    <div>
      <label className="block text-[10px] mb-1 text-center" style={{ color }}>
        {label}
      </label>
      <input
        className="input text-center tabular-nums px-1 py-1.5"
        type="number"
        min="0"
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
      />
    </div>
  )
}

function NotConfigured() {
  return (
    <div className="text-center py-8 px-4">
      <Sparkles className="mx-auto text-muted/40 mb-2" size={28} />
      <p className="text-sm font-medium">AI isn't set up yet</p>
      <p className="text-xs text-muted mt-1">
        Add your API key in <span className="text-brand-soft">Settings → AI assistant</span> to log food by just
        describing it.
      </p>
    </div>
  )
}
