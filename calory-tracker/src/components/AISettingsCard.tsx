import { useState } from 'react'
import { Sparkles, Eye, EyeOff, RefreshCw, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Card } from './ui/Card'
import { listModels, aiConfigured } from '../lib/ai'

export function AISettingsCard() {
  const ai = useStore((s) => s.ai)
  const updateAI = useStore((s) => s.updateAI)

  const [showKey, setShowKey] = useState(false)
  const [models, setModels] = useState<string[]>(ai.model ? [ai.model] : [])
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null)

  async function loadModels() {
    if (!ai.apiKey) {
      setStatus({ kind: 'err', msg: 'Enter your API key first.' })
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const list = await listModels({ apiKey: ai.apiKey, baseUrl: ai.baseUrl })
      setModels(list)
      setStatus({ kind: 'ok', msg: `Connected — ${list.length} models available.` })
      if (!ai.model && list.length) updateAI({ model: list[0] })
    } catch (e: any) {
      setStatus({ kind: 'err', msg: e?.message ?? 'Could not connect.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title="AI assistant"
      subtitle="Connect the MaibornWolff AI gateway (LiteLLM)"
      action={
        <span
          className={`chip ${aiConfigured(ai) ? 'chip-active' : ''}`}
          title={aiConfigured(ai) ? 'AI is ready' : 'Not configured'}
        >
          <Sparkles size={12} /> {aiConfigured(ai) ? 'Ready' : 'Off'}
        </span>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">API key</label>
          <div className="relative">
            <input
              className="input pr-10 font-mono"
              type={showKey ? 'text' : 'password'}
              placeholder="sk-…"
              value={ai.apiKey}
              autoComplete="off"
              onChange={(e) => updateAI({ apiKey: e.target.value.trim() })}
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <p className="text-[11px] text-muted mt-1.5">
            Stored only in this browser. Get a key from{' '}
            <a
              href="https://aikeys.maibornwolff.de/ui"
              target="_blank"
              rel="noreferrer"
              className="text-brand-soft hover:underline inline-flex items-center gap-0.5"
            >
              the AI gateway <ExternalLink size={11} />
            </a>
            .
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Gateway URL</label>
            <input
              className="input"
              value={ai.baseUrl}
              onChange={(e) => updateAI({ baseUrl: e.target.value.trim() })}
            />
          </div>
          <div>
            <label className="label">Model</label>
            <div className="flex gap-2">
              <select
                className="input"
                value={ai.model}
                onChange={(e) => updateAI({ model: e.target.value })}
              >
                {models.length === 0 && <option value="">Load models →</option>}
                {ai.model && !models.includes(ai.model) && <option value={ai.model}>{ai.model}</option>}
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadModels}
                disabled={loading}
                className="btn-ghost shrink-0 px-3"
                title="Test connection & load models"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {status && (
          <div
            className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${
              status.kind === 'ok'
                ? 'border-brand/30 bg-brand/10 text-brand-soft'
                : 'border-fat/30 bg-fat/10 text-fat'
            }`}
          >
            {status.kind === 'ok' ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}
            {status.msg}
          </div>
        )}

        <p className="text-[11px] text-muted">
          Enables natural-language food logging, the AI coach on your dashboard, and AI recipe generation.
        </p>
      </div>
    </Card>
  )
}
