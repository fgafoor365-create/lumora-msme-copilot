import { useState } from 'react'
import type { CheckupInput, DailyRecord, Insight, Page, PendingPayment } from '../types'
import { openPayments, remainingOf, sortByDate } from '../lib/calc'
import { fmtINR, margin, toNumber, todayStr } from '../lib/utils'
import { AmountField, InsightCard } from './ui'

type Props = {
  records: DailyRecord[]
  pending: PendingPayment[]
  insights: Insight[]
  onSave: (input: CheckupInput) => void
  onNavigate: (page: Page, question?: string) => void
}

function typical(records: DailyRecord[], key: 'sales' | 'expenses'): number | null {
  const last = sortByDate(records).slice(-14)
  if (!last.length) return null
  const avg = last.reduce((s, r) => s + r[key], 0) / last.length
  return Math.round(avg / 500) * 500
}

function chipsFor(t: number | null, fallback: number[]): number[] {
  if (!t || t <= 0) return fallback
  const set = new Set([0.6, 0.8, 1, 1.2, 1.5].map((m) => Math.max(500, Math.round((t * m) / 500) * 500)))
  return [...set].sort((a, b) => a - b)
}

export default function CheckupPage({ records, pending, insights, onSave, onNavigate }: Props) {
  const existing = records.find((r) => r.date === todayStr())
  const open = openPayments(pending)

  const [sales, setSales] = useState(existing ? String(existing.sales) : '')
  const [expenses, setExpenses] = useState(existing ? String(existing.expenses) : '')
  const [received, setReceived] = useState('')
  const [paidId, setPaidId] = useState('')
  const [credit, setCredit] = useState('')
  const [customer, setCustomer] = useState('')
  const [note, setNote] = useState(existing?.note ?? '')
  const [errors, setErrors] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  const s = toNumber(sales)
  const e = toNumber(expenses)
  const profit = s - e
  const pct = margin(profit, s)

  const handleSave = () => {
    const problems: string[] = []
    const rec = toNumber(received)
    const cr = toNumber(credit)
    if (cr > 0 && !customer.trim()) problems.push('Add who the new credit was for.')
    if (rec > 0 && open.length > 0 && !paidId) problems.push('Choose who paid you.')
    const payer = open.find((p) => p.id === paidId)
    if (rec > 0 && payer && rec > remainingOf(payer)) {
      problems.push(`${payer.customer} only owes ${fmtINR(remainingOf(payer))}.`)
    }
    setErrors(problems)
    if (problems.length) return

    onSave({
      sales: s,
      expenses: e,
      paymentsReceived: open.length > 0 ? rec : 0,
      creditGiven: cr,
      note: note.trim() || undefined,
      creditCustomer: customer.trim() || undefined,
      paidPaymentId: paidId || undefined,
    })
    setReceived('')
    setPaidId('')
    setCredit('')
    setCustomer('')
    setSaved(true)
    window.scrollTo({ top: 0 })
  }

  if (saved) {
    return (
      <div className="lm-stack">
        <section className="lm-card lm-saved">
          <span className="lm-label terra">SAVED</span>
          <h2>Thanks. Lumora has the picture for today.</h2>
          <div className="lm-profit">
            <span>Estimated profit</span>
            <strong className={profit < 0 ? 'neg' : ''}>{fmtINR(profit)}</strong>
            <small>{s > 0 ? `${Math.round(pct)}% margin on ${fmtINR(s)} sales` : 'No sales recorded today'}</small>
          </div>
        </section>

        <section>
          <div className="lm-section-head">
            <span className="lm-label terra">WHAT LUMORA NOTICED</span>
          </div>
          {insights[0] && <InsightCard insight={insights[0]} onAsk={(q) => onNavigate('copilot', q)} />}
        </section>

        <div className="lm-row-actions">
          <button type="button" className="lm-btn primary" onClick={() => onNavigate('home')}>
            See Home
          </button>
          <button type="button" className="lm-btn ghost" onClick={() => onNavigate('copilot', insights[0]?.question)}>
            Ask Copilot
          </button>
          <button type="button" className="lm-btn ghost" onClick={() => setSaved(false)}>
            Edit today
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="lm-stack">
      <section className="lm-hero compact">
        <div>
          <span className="lm-label terra">TODAY’S CHECK-UP</span>
          <h2>Tell us what happened today.</h2>
          <p>Just the basics. You can leave anything blank.</p>
          {existing && (
            <p className="lm-field-hint">
              You’ve already recorded today. Saving again updates sales and expenses; credit and payments are added.
            </p>
          )}
        </div>
      </section>

      <section className="lm-card lm-form">
        <AmountField
          id="sales"
          label="How much did you sell today?"
          hint="Total sales, cash and digital together."
          value={sales}
          onChange={setSales}
          chips={chipsFor(typical(records, 'sales'), [2000, 5000, 10000, 15000])}
          autoFocus
        />

        <AmountField
          id="expenses"
          label="How much did you spend today?"
          hint="Stock, rent share, transport, helpers, anything the business paid for."
          value={expenses}
          onChange={setExpenses}
          chips={chipsFor(typical(records, 'expenses'), [500, 1000, 2500, 5000])}
        />

        <div className="lm-preview" aria-live="polite">
          <span>Estimated profit</span>
          <strong className={profit < 0 ? 'neg' : ''}>{fmtINR(profit)}</strong>
          <small>{s > 0 ? `${Math.round(pct)}% margin` : 'Add today’s sales to see your margin'}</small>
        </div>

        {open.length > 0 && (
          <div className="lm-sub">
            <AmountField
              id="received"
              label="Did anyone pay back money they owed?"
              value={received}
              onChange={setReceived}
              chips={[500, 1000, 2000, 5000]}
            />
            {toNumber(received) > 0 && (
              <div className="lm-field">
                <label htmlFor="payer" className="lm-field-label">
                  Who paid?
                </label>
                <select id="payer" className="lm-input" value={paidId} onChange={(ev) => setPaidId(ev.target.value)}>
                  <option value="">Choose a customer</option>
                  {open.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.customer} · owes {fmtINR(remainingOf(p))}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="lm-sub">
          <AmountField
            id="credit"
            label="Did you give anything on credit today?"
            hint="Sold now, to be paid later."
            value={credit}
            onChange={setCredit}
            chips={[500, 1000, 2000, 5000]}
          />
          {toNumber(credit) > 0 && (
            <div className="lm-field">
              <label htmlFor="cust" className="lm-field-label">
                Who was it for?
              </label>
              <input
                id="cust"
                className="lm-input"
                value={customer}
                onChange={(ev) => setCustomer(ev.target.value)}
                placeholder="Customer name"
                autoComplete="off"
              />
            </div>
          )}
        </div>

        <div className="lm-field">
          <label htmlFor="note" className="lm-field-label">
            Anything unusual today? <span className="lm-optional">Optional</span>
          </label>
          <input
            id="note"
            className="lm-input"
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="e.g. Bought extra stock, shop closed early"
            autoComplete="off"
          />
        </div>

        {errors.length > 0 && (
          <ul className="lm-errors" role="alert">
            {errors.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}

        <button type="button" className="lm-btn primary lg block" onClick={handleSave}>
          Save today
        </button>
      </section>
    </div>
  )
}
