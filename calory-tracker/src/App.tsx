import { useState } from 'react'
import { LayoutDashboard, UtensilsCrossed, Dumbbell, Scale, Target, LineChart, Settings as Cog, Flame } from 'lucide-react'
import { Dashboard } from './pages/Dashboard'
import { FoodLog } from './pages/FoodLog'
import { Fitness } from './pages/Fitness'
import { WeightPage } from './pages/Weight'
import { Planner } from './pages/Planner'
import { Trends } from './pages/Trends'
import { SettingsPage } from './pages/Settings'

type Tab = 'dashboard' | 'food' | 'fitness' | 'weight' | 'planner' | 'trends' | 'settings'

const NAV: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'food', label: 'Food', icon: UtensilsCrossed },
  { key: 'fitness', label: 'Fitness', icon: Dumbbell },
  { key: 'weight', label: 'Weight', icon: Scale },
  { key: 'planner', label: 'Planner', icon: Target },
  { key: 'trends', label: 'Trends', icon: LineChart },
  { key: 'settings', label: 'Settings', icon: Cog },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-border bg-surface/60 backdrop-blur px-4 py-6">
        <Brand />
        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                tab === key
                  ? 'bg-brand/15 text-brand-soft'
                  : 'text-muted hover:text-ink hover:bg-card-hover'
              }`}
            >
              <Icon size={18} className={tab === key ? 'text-brand-soft' : ''} />
              {label}
            </button>
          ))}
        </nav>
        <div className="mt-auto text-[11px] text-muted/70 leading-relaxed">
          Calory Tracker
          <br />
          Your data stays in this browser.
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pb-24 md:pb-10">
        <div className="md:hidden sticky top-0 z-20 bg-surface/80 backdrop-blur border-b border-border px-4 py-3">
          <Brand />
        </div>
        <div className="mx-auto max-w-6xl px-4 md:px-8 pt-6 md:pt-10">
          {tab === 'dashboard' && <Dashboard onNavigate={(t) => setTab(t)} />}
          {tab === 'food' && <FoodLog />}
          {tab === 'fitness' && <Fitness />}
          {tab === 'weight' && <WeightPage />}
          {tab === 'planner' && <Planner />}
          {tab === 'trends' && <Trends />}
          {tab === 'settings' && <SettingsPage />}
        </div>
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-surface/90 backdrop-blur border-t border-border grid grid-cols-7">
        {NAV.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex flex-col items-center gap-1 py-2.5 text-[9px] font-medium transition ${
              tab === key ? 'text-brand-soft' : 'text-muted'
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand shadow-glow">
        <Flame size={20} />
      </span>
      <div className="leading-tight">
        <div className="text-sm font-extrabold tracking-tight">Calory Tracker</div>
        <div className="text-[10px] text-muted">eat • train • progress</div>
      </div>
    </div>
  )
}

export type { Tab }
