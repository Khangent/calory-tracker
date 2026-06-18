import { Fragment } from 'react'

/** Renders inline **bold** within a line. */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**') ? (
      <strong key={i} className="text-ink font-semibold">
        {p.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{p}</Fragment>
    ),
  )
}

/** Very small markdown renderer: paragraphs, `-`/`*` bullets, and **bold**. */
export function MiniMarkdown({ text }: { text: string }) {
  const lines = text.trim().split('\n')
  const out: JSX.Element[] = []
  let bullets: string[] = []

  const flush = () => {
    if (bullets.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="space-y-1 my-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-brand-soft mt-0.5">•</span>
              <span>{inline(b)}</span>
            </li>
          ))}
        </ul>,
      )
      bullets = []
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flush()
      continue
    }
    const m = line.match(/^[-*]\s+(.*)$/)
    if (m) {
      bullets.push(m[1])
    } else {
      flush()
      const heading = line.replace(/^#+\s*/, '')
      out.push(
        <p key={`p-${out.length}`} className="my-1">
          {inline(heading)}
        </p>,
      )
    }
  }
  flush()

  return <div className="text-sm text-muted leading-relaxed">{out}</div>
}
