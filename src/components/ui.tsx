import type { Insight } from '../types'
import { decodeHtmlEntities, fmtShort, pctChange } from '../lib/utils'
import { useI18n } from '../lib/i18n'

export function InsightCard({
  insight,
  onAsk,
}: {
  insight: Insight
  onAsk?: (question: string) => void
}) {
  const { t } = useI18n()
  const mark = insight.tone === 'good' ? '↑' : insight.tone === 'warn' ? '!' : 'i'
  return (
    <article className={`lm-insight ${insight.tone}`}>
      <div className="lm-insight-mark" aria-hidden="true">
        {mark}
      </div>
      <div className="lm-insight-body">
        <span className="lm-label">{insight.label}</span>
        <h3>{insight.title}</h3>
        <p>{insight.body}</p>

        {insight.facts.length > 0 && (
          <dl className="lm-facts">
            {insight.facts.map((f) => (
              <div key={f.label} className={f.strong ? 'strong' : ''}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {insight.note && <p className="lm-insight-note">{t('dashYourNote', { note: decodeHtmlEntities(insight.note) })}</p>}

        {onAsk && (
          <button type="button" className="lm-link" onClick={() => onAsk(insight.question)}>
            {t('understandWithLumora')} →
          </button>
        )}
      </div>
    </article>
  )
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="lm-empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {actionLabel && onAction && (
        <button type="button" className="lm-btn primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}

type AmountFieldProps = {
  id: string
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  chips?: number[]
  autoFocus?: boolean
}

export function AmountField({ id, label, hint, value, onChange, chips, autoFocus }: AmountFieldProps) {
  return (
    <div className="lm-field">
      <label htmlFor={id} className="lm-field-label">
        {label}
      </label>
      {hint && <p className="lm-field-hint">{hint}</p>}
      <div className="lm-amount">
        <span aria-hidden="true">₹</span>
        <input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
        />
      </div>
      {chips && chips.length > 0 && (
        <div className="lm-chips" role="group" aria-label={`Quick amounts for ${label}`}>
          {chips.map((c) => (
            <button
              key={c}
              type="button"
              className={`lm-chip ${Number(value) === c ? 'on' : ''}`}
              onClick={() => onChange(String(c))}
            >
              {fmtShort(c)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Change versus a previous period. Shows nothing when there is nothing to compare. */
export function Delta({
  cur,
  prev,
  hasPrev,
  upIsGood = true,
}: {
  cur: number
  prev: number
  hasPrev: boolean
  upIsGood?: boolean
}) {
  const { t } = useI18n()
  if (!hasPrev) return null
  const d = cur - prev
  if (Math.round(d) === 0) return <span className="lm-delta flat">{t('dashNoChange')}</span>
  const p = pctChange(cur, prev)
  const text = p !== null ? `${Math.abs(Math.round(p))}%` : fmtShort(Math.abs(d))
  const good = upIsGood ? d > 0 : d < 0
  return (
    <span className={`lm-delta ${good ? 'good' : 'warn'}`}>
      {d > 0 ? '↑' : '↓'} {text}
    </span>
  )
}
