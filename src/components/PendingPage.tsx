import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Insight, Page, PendingPayment } from '../types'
import { openPayments, paidOf, remainingOf, totalRemaining } from '../lib/calc'
import { addDays, daysBetween, fmtDay, fmtINR, fmtShort, toNumber, todayStr } from '../lib/utils'
import { EmptyState, InsightCard } from './ui'

type Props = {
  pending: PendingPayment[]
  insights: Insight[]
  onAdd: (customer: string, amount: number, date: string) => void
  onPay: (id: string, amount: number) => void
  onNavigate: (page: Page, question?: string) => void
}

const OLD_AFTER_DAYS = 14

export default function PendingPage({ pending, insights, onAdd, onPay, onNavigate }: Props) {
  const today = todayStr()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [formError, setFormError] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payError, setPayError] = useState('')

  const open = openPayments(pending).sort((a, b) => a.dateGiven.localeCompare(b.dateGiven))
  const settled = pending.filter((p) => remainingOf(p) === 0)
  const total = totalRemaining(pending)
  const older = open.filter((p) => daysBetween(p.dateGiven, today) >= OLD_AFTER_DAYS)
  const olderTotal = older.reduce((s, p) => s + remainingOf(p), 0)
  const largest = open.length ? open.reduce((b, p) => (remainingOf(p) > remainingOf(b) ? p : b), open[0]) : null
  const recentFrom = addDays(today, -6)
  const recentlyPaid = pending.reduce(
    (s, p) => s + p.payments.filter((x) => x.date >= recentFrom).reduce((a, x) => a + x.amount, 0),
    0,
  )
  const buildUp = insights.find((i) => i.id === 'pending-building')

  const submitNew = () => {
    const amt = toNumber(amount)
    if (!name.trim()) return setFormError('Add the customer’s name.')
    if (amt <= 0) return setFormError('Add the amount they owe.')
    onAdd(name, amt, date || today)
    setName('')
    setAmount('')
    setDate(today)
    setFormError('')
    setShowForm(false)
  }

  const submitPayment = (p: PendingPayment) => {
    const amt = toNumber(payAmount)
    if (amt <= 0) return setPayError('Add the amount received.')
    if (amt > remainingOf(p)) return setPayError(`${p.customer} only owes ${fmtINR(remainingOf(p))}.`)
    onPay(p.id, amt)
    setPayingId(null)
    setPayAmount('')
    setPayError('')
  }

  return (
    <div className="lm-stack">
      <section className="lm-card">
        <div className="lm-card-head">
          <div>
            <span className="lm-label">STILL TO COLLECT</span>
            <h3>{fmtINR(total)}</h3>
          </div>
          <button type="button" className="lm-btn primary" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
            <Plus size={16} aria-hidden="true" /> Add
          </button>
        </div>

        <div className="lm-metric-grid">
          <div>
            <span>Older than {OLD_AFTER_DAYS} days</span>
            <strong>{older.length ? fmtINR(olderTotal) : '–'}</strong>
            {older.length > 0 && <small>{older.length} customer{older.length === 1 ? '' : 's'}</small>}
          </div>
          <div>
            <span>Paid in last 7 days</span>
            <strong>{recentlyPaid > 0 ? fmtINR(recentlyPaid) : '–'}</strong>
          </div>
          <div>
            <span>Largest</span>
            <strong>{largest ? fmtINR(remainingOf(largest)) : '–'}</strong>
            {largest && <small>{largest.customer}</small>}
          </div>
        </div>
      </section>

      {buildUp && <InsightCard insight={buildUp} onAsk={(q) => onNavigate('copilot', q)} />}

      {showForm && (
        <section className="lm-card lm-form">
          <h3>Add money someone owes you</h3>
          <div className="lm-field">
            <label htmlFor="pp-name" className="lm-field-label">Customer</label>
            <input id="pp-name" className="lm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer name" autoComplete="off" />
          </div>
          <div className="lm-field">
            <label htmlFor="pp-amount" className="lm-field-label">Amount owed</label>
            <div className="lm-amount">
              <span aria-hidden="true">₹</span>
              <input id="pp-amount" inputMode="numeric" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))} />
            </div>
          </div>
          <div className="lm-field">
            <label htmlFor="pp-date" className="lm-field-label">Date given on credit</label>
            <input id="pp-date" type="date" className="lm-input" value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </div>
          {formError && <p className="lm-errors" role="alert">{formError}</p>}
          <button type="button" className="lm-btn primary block" onClick={submitNew}>Save</button>
        </section>
      )}

      {open.length === 0 ? (
        <EmptyState title="Nobody owes you right now" body="When you give something on credit, add it here and Lumora will keep track." />
      ) : (
        <section className="lm-stack tight" aria-label="Customers who owe you">
          {open.map((p) => {
            const age = daysBetween(p.dateGiven, today)
            const paid = paidOf(p)
            const isOld = age >= OLD_AFTER_DAYS
            return (
              <article key={p.id} className="lm-card lm-pend">
                <div className="lm-pend-top">
                  <div>
                    <h3>{p.customer}</h3>
                    <span className="lm-soft">
                      Given {fmtDay(p.dateGiven)} · {age === 0 ? 'today' : `${age} day${age === 1 ? '' : 's'} ago`}
                      {isOld && <b className="lm-tag warn">Older</b>}
                    </span>
                  </div>
                  <div className="lm-pend-remaining">
                    <strong>{fmtINR(remainingOf(p))}</strong>
                    <span>remaining</span>
                  </div>
                </div>

                <div className="lm-progress" aria-hidden="true">
                  <div style={{ width: `${Math.min(100, (paid / p.amount) * 100)}%` }} />
                </div>
                <div className="lm-pend-meta">
                  <span>Owed {fmtINR(p.amount)}</span>
                  <span>Paid {fmtINR(paid)}</span>
                </div>

                {payingId === p.id ? (
                  <div className="lm-pay">
                    <div className="lm-amount">
                      <span aria-hidden="true">₹</span>
                      <input
                        inputMode="numeric"
                        aria-label={`Amount received from ${p.customer}`}
                        placeholder="0"
                        autoFocus
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                      />
                    </div>
                    <div className="lm-chips left">
                      <button type="button" className="lm-chip" onClick={() => setPayAmount(String(remainingOf(p)))}>
                        Full {fmtShort(remainingOf(p))}
                      </button>
                      {[500, 1000, 2000].filter((c) => c < remainingOf(p)).map((c) => (
                        <button key={c} type="button" className="lm-chip" onClick={() => setPayAmount(String(c))}>
                          {fmtShort(c)}
                        </button>
                      ))}
                    </div>
                    {payError && <p className="lm-errors" role="alert">{payError}</p>}
                    <div className="lm-row-actions">
                      <button type="button" className="lm-btn primary" onClick={() => submitPayment(p)}>Record payment</button>
                      <button type="button" className="lm-btn ghost" onClick={() => { setPayingId(null); setPayError('') }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" className="lm-btn ghost" onClick={() => { setPayingId(p.id); setPayAmount(''); setPayError('') }}>
                    Record a payment
                  </button>
                )}
              </article>
            )
          })}
        </section>
      )}

      {settled.length > 0 && (
        <section>
          <div className="lm-section-head">
            <span className="lm-label">PAID IN FULL</span>
          </div>
          <ul className="lm-card lm-day-list">
            {settled.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.customer}</strong>
                  <span>Given {fmtDay(p.dateGiven)}</span>
                </div>
                <div className="lm-day-nums">
                  <span>{fmtINR(p.amount)}</span>
                  <span className="lm-tag good">Settled</span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
