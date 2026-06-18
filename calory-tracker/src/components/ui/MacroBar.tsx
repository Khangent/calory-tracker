import { pct, round } from '../../lib/calc'

interface MacroBarProps {
  label: string
  value: number
  goal: number
  color: string
  unit?: string
}

export function MacroBar({ label, value, goal, color, unit = 'g' }: MacroBarProps) {
  const p = pct(value, goal)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-xs font-medium text-muted flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="text-xs tabular-nums text-ink">
          <span className="font-semibold">{round(value)}</span>
          <span className="text-muted"> / {round(goal)}{unit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${p}%`, background: color }}
        />
      </div>
    </div>
  )
}
