import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent?: string
  trend?: { dir: 'up' | 'down' | 'flat'; text: string; good?: boolean }
}

export function StatCard({ label, value, hint, icon: Icon, accent = '#22c55e', trend }: StatCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-2 animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted">{label}</span>
        <span
          className="grid h-8 w-8 place-items-center rounded-lg"
          style={{ background: `${accent}1f`, color: accent }}
        >
          <Icon size={16} />
        </span>
      </div>
      <div className="text-2xl font-bold tabular-nums tracking-tight">{value}</div>
      <div className="flex items-center gap-2 text-xs">
        {trend && (
          <span
            className="font-medium"
            style={{ color: trend.good === false ? '#f87171' : '#4ade80' }}
          >
            {trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '•'} {trend.text}
          </span>
        )}
        {hint && <span className="text-muted">{hint}</span>}
      </div>
    </div>
  )
}
