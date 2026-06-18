import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  subtitle?: string
  action?: ReactNode
}

export function Card({ children, className = '', title, subtitle, action }: CardProps) {
  return (
    <section className={`card p-5 ${className}`}>
      {(title || action) && (
        <header className="flex items-start justify-between mb-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
