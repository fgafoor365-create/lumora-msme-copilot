
import { useState } from 'react'
import { Plus, HandCoins, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import type { Insight, Page, PendingPayment } from '../types'
import {
  openPayments,
  paidOf,
  remainingOf,
  totalRemaining,
} from '../lib/calc'
import {
  addDays,
  daysBetween,
  fmtDay,
  fmtINR,
  fmtShort,
  toNumber,
  todayStr,
} from '../lib/utils'
import { EmptyState, InsightCard } from './ui'
import { useI18n } from '../lib/i18n'

type Props = {
  pending: PendingPayment[]
  insights: Insight[]
  onAdd: (customer: string, amount: number, date: string) => void
  onPay: (id: string, amount: number) => void
  onNavigate: (page: Page, question?: string) => void
}

const OLD_AFTER_DAYS = 14

export default function PendingPage({
  pending,
  insights,
  onAdd,
  onPay,
  onNavigate,
}: Props) {
  const { t } = useI18n()
  const today = todayStr()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today)
  const [formError, setFormError] = useState('')

  const [payingId, setPayingId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payError, setPayError] = useState('')

  const open = openPayments(pending).sort((a, b) =>
    a.dateGiven.localeCompare(b.dateGiven),
  )
  const settled = pending.filter((p) => remainingOf(p) === 0)
  const total = totalRemaining(pending)

  const older = open.filter(
    (p) => daysBetween(p.dateGiven, today) >= OLD_AFTER_DAYS,
  )
  const olderTotal = older.reduce((sum, p) => sum + remainingOf(p), 0)

  const largest = open.length
    ? open.reduce(
        (largestPayment, p) =>
          remainingOf(p) > remainingOf(largestPayment)
            ? p
            : largestPayment,
        open[0],
      )
    : null

  const recentFrom = addDays(today, -6)
  const recentlyPaid = pending.reduce(
    (sum, p) =>
      sum +
      p.payments
        .filter((payment) => payment.date >= recentFrom && payment.date <= today)
        .reduce((paymentSum, payment) => paymentSum + payment.amount, 0),
    0,
  )

  const buildUp = insights.find((insight) => insight.id === 'pending-building')

  const submitNew = () => {
    const customerName = name.trim()
    const numericAmount = toNumber(amount)

    if (!customerName) {
      setFormError(t('enterCustomerName'))
      return
    }

    if (numericAmount <= 0) {
      setFormError(t('enterValidAmount'))
      return
    }

    if (!date || date > today) {
      setFormError('Choose today or an earlier date.')
      return
    }

    onAdd(customerName, numericAmount, date)

    setName('')
    setAmount('')
    setDate(today)
    setFormError('')
    setShowForm(false)
  }

  const submitPayment = (p: PendingPayment) => {
    const numericAmount = toNumber(payAmount)
    const remaining = remainingOf(p)

    if (numericAmount <= 0) {
      setPayError('Enter the amount you received.')
      return
    }

    if (numericAmount > remaining) {
      setPayError(
        `${p.customer} only owes ${fmtINR(remaining)}.`,
      )
      return
    }

    onPay(p.id, numericAmount)
    setPayingId(null)
    setPayAmount('')
    setPayError('')
  }

  const cancelAdd = () => {
    setShowForm(false)
    setName('')
    setAmount('')
    setDate(today)
    setFormError('')
  }

  const startPayment = (id: string) => {
    setPayingId(id)
    setPayAmount('')
    setPayError('')
  }

  const cancelPayment = () => {
    setPayingId(null)
    setPayAmount('')
    setPayError('')
  }

  return (
    <div className="lm-stack">
      <section className="lm-card">
        <div className="lm-card-head">
          <div>
            <span className="lm-label">{t('stillToCollect')}</span>
            <h3>{fmtINR(total)}</h3>
            <p className="lm-soft">
              {open.length === 0
                ? t('settled')
                : `${open.length} customer${open.length === 1 ? '' : 's'} with outstanding balances`}
            </p>
          </div>

          <button
            type="button"
            className="lm-btn primary"
            onClick={() => {
              setShowForm((current) => !current)
              setFormError('')
            }}
            aria-expanded={showForm}
          >
            <Plus size={16} aria-hidden="true" />
            {t('add')}
          </button>
        </div>

        <div className="lm-metric-grid">
          <div>
            <span>{t('olderThan14Days')}</span>
            <strong>{older.length > 0 ? fmtINR(olderTotal) : '—'}</strong>
            {older.length > 0 && (
              <small>
                {older.length} customer{older.length === 1 ? '' : 's'}
              </small>
            )}
          </div>

          <div>
            <span>{t('paidInLast7Days')}</span>
            <strong>{recentlyPaid > 0 ? fmtINR(recentlyPaid) : '—'}</strong>
          </div>

          <div>
            <span>{t('largest')}</span>
            <strong>
              {largest ? fmtINR(remainingOf(largest)) : '—'}
            </strong>
            {largest && <small>{largest.customer}</small>}
          </div>
        </div>
      </section>

      {showForm && (
        <section className="lm-card lm-form">
          <div className="lm-card-head">
            <div>
              <span className="lm-label">{t('creditGiven')}</span>
              <h3>{t('addPayment')}</h3>
              <p className="lm-soft">{t('basedOnRecords')}</p>
            </div>

            <button
              type="button"
              className="lm-btn ghost"
              onClick={cancelAdd}
            >
              {t('cancel')}
            </button>
          </div>

          <div className="lm-field">
            <label htmlFor="pp-name" className="lm-field-label">
              {t('customerName')}
            </label>
            <input
              id="pp-name"
              className="lm-input"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setFormError('')
              }}
              placeholder="e.g. Ravi Traders"
              autoComplete="off"
            />
          </div>

          <div className="lm-field">
            <label htmlFor="pp-amount" className="lm-field-label">
              {t('owed')}
            </label>
            <div className="lm-amount">
              <span aria-hidden="true">₹</span>
              <input
                id="pp-amount"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(event) => {
                  setAmount(
                    event.target.value.replace(/[^0-9]/g, '').slice(0, 9),
                  )
                  setFormError('')
                }}
              />
            </div>
          </div>

          <div className="lm-field">
            <label htmlFor="pp-date" className="lm-field-label">
              {t('date')}
            </label>
            <input
              id="pp-date"
              type="date"
              className="lm-input"
              value={date}
              max={today}
              onChange={(event) => {
                setDate(event.target.value)
                setFormError('')
              }}
            />
          </div>

          {formError && (
            <p className="lm-errors" role="alert">
              {formError}
            </p>
          )}

          <button
            type="button"
            className="lm-btn primary block"
            onClick={submitNew}
          >
            {t('save')}
          </button>
        </section>
      )}

      {buildUp && (
        <InsightCard
          insight={buildUp}
          onAsk={(question) => onNavigate('copilot', question)}
        />
      )}

      {open.length === 0 ? (
        <EmptyState
          title={t('noPendingPayments')}
          body={t('noPendingPaymentsBody')}
          actionLabel={t('addPayment')}
          onAction={() => {
            setShowForm(true)
            setFormError('')
          }}
        />
      ) : (
        <section className="lm-stack tight" aria-label="Customers who owe you">
          <div className="lm-section-head">
            <span className="lm-label">{t('pending')}</span>
            <h3>{t('stillPending')}</h3>
          </div>

          {open.map((p) => {
            const age = Math.max(0, daysBetween(p.dateGiven, today))
            const paid = paidOf(p)
            const remaining = remainingOf(p)
            const isOld = age >= OLD_AFTER_DAYS
            const progress = p.amount > 0
              ? Math.min(100, Math.max(0, (paid / p.amount) * 100))
              : 0

            return (
              <article key={p.id} className="lm-card lm-pend">
                <div className="lm-pend-top">
                  <div>
                    <h3>{p.customer}</h3>
                    <span className="lm-soft">
                      {t('given')} {fmtDay(p.dateGiven)} ·{' '}
                      {age === 0
                        ? t('today').toLowerCase()
                        : `${age} day${age === 1 ? '' : 's'} ago`}
                      {isOld && (
                        <b className="lm-tag warn">{t('olderThan14Days')}</b>
                      )}
                    </span>
                  </div>

                  <div className="lm-pend-remaining">
                    <strong>{fmtINR(remaining)}</strong>
                    <span>{t('owed')}</span>
                  </div>
                </div>

                <div
                  className="lm-progress"
                  role="progressbar"
                  aria-label={`${p.customer} repayment progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress)}
                >
                  <div style={{ width: `${progress}%` }} />
                </div>

                <div className="lm-pend-meta">
                  <span>{t('amount')} {fmtINR(p.amount)}</span>
                  <span>{t('received')} {fmtINR(paid)}</span>
                </div>

                {payingId === p.id ? (
                  <div className="lm-pay">
                    <div className="lm-field">
                      <label
                        htmlFor={`pp-pay-${p.id}`}
                        className="lm-field-label"
                      >
                        {t('received')}
                      </label>
                      <div className="lm-amount">
                        <span aria-hidden="true">₹</span>
                        <input
                          id={`pp-pay-${p.id}`}
                          inputMode="numeric"
                          placeholder="0"
                          autoFocus
                          value={payAmount}
                          onChange={(event) => {
                            setPayAmount(
                              event.target.value
                                .replace(/[^0-9]/g, '')
                                .slice(0, 9),
                            )
                            setPayError('')
                          }}
                        />
                      </div>
                    </div>

                    <div className="lm-chips left">
                      <button
                        type="button"
                        className="lm-chip"
                        onClick={() => {
                          setPayAmount(String(remaining))
                          setPayError('')
                        }}
                      >
                        {t('paidInFull')} · {fmtShort(remaining)}
                      </button>

                      {[500, 1000, 2000]
                        .filter((value) => value < remaining)
                        .map((value) => (
                          <button
                            key={value}
                            type="button"
                            className="lm-chip"
                            onClick={() => {
                              setPayAmount(String(value))
                              setPayError('')
                            }}
                          >
                            {fmtShort(value)}
                          </button>
                        ))}
                    </div>

                    <p className="lm-soft">
                      {t('stillPending')}{' '}
                      {fmtINR(Math.max(0, remaining - toNumber(payAmount)))}
                    </p>

                    {payError && (
                      <p className="lm-errors" role="alert">
                        {payError}
                      </p>
                    )}

                    <div className="lm-row-actions">
                      <button
                        type="button"
                        className="lm-btn primary"
                        onClick={() => submitPayment(p)}
                      >
                        <CheckCircle2 size={16} aria-hidden="true" />
                        {t('recordPayment')}
                      </button>

                      <button
                        type="button"
                        className="lm-btn ghost"
                        onClick={cancelPayment}
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="lm-btn ghost"
                    onClick={() => startPayment(p.id)}
                  >
                    <HandCoins size={16} aria-hidden="true" />
                    {t('recordPayment')}
                    <ArrowUpRight size={16} aria-hidden="true" />
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
            <h3>Settled customers</h3>
          </div>

          <ul className="lm-card lm-day-list">
            {settled.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.customer}</strong>
                  <span>Credit given {fmtDay(p.dateGiven)}</span>
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

