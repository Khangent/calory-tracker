import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { addDaysKey, prettyDate, isToday, todayKey } from '../lib/date'

interface DateNavProps {
  date: string
  onChange: (date: string) => void
}

export function DateNav({ date, onChange }: DateNavProps) {
  return (
    <div className="flex items-center gap-1">
      <button
        className="grid h-9 w-9 place-items-center rounded-lg bg-surface border border-border text-muted hover:text-ink transition"
        onClick={() => onChange(addDaysKey(date, -1))}
        aria-label="Previous day"
      >
        <ChevronLeft size={18} />
      </button>

      <label className="relative flex items-center gap-2 rounded-lg bg-surface border border-border px-3 h-9 text-sm font-medium cursor-pointer hover:text-ink min-w-[150px] justify-center">
        <CalendarDays size={15} className="text-brand-soft" />
        <span>{isToday(date) ? 'Today' : prettyDate(date)}</span>
        <input
          type="date"
          value={date}
          max={todayKey()}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
      </label>

      <button
        className="grid h-9 w-9 place-items-center rounded-lg bg-surface border border-border text-muted hover:text-ink transition disabled:opacity-30 disabled:pointer-events-none"
        onClick={() => onChange(addDaysKey(date, 1))}
        disabled={isToday(date)}
        aria-label="Next day"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
