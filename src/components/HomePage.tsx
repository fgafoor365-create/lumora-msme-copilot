import { ArrowUpRight, HandCoins, PiggyBank, Plus, Sparkles } from 'lucide-react'
import type { Business, DailyRecord, Insight, Page, PendingPayment, SavingsGoal } from '../types'
import { goalEstimate, goalProgress, goalRemaining, profitOf, sortByDate, totalRemaining } from '../lib/calc'
import { fmtDay, fmtINR, fmtShort, margin, todayStr } from '../lib/utils'
import { EmptyState, InsightCard } from './ui'

type Props = {
  business: Business
  records: DailyRecord[]
  pending: PendingPayment[]
  goals: SavingsGoal[]
  insights: Insight[]
  onNavigate: (page: Page, question?: string) => void
  onResetDemo: () => void
}

export default function HomePage({ business, records, pending, goals, insights, onNavigate, onResetDemo }: Props) {
  const today = todayStr()
  const sorted = sortByDate(records)
  const shown = sorted.find((r) => r.date === today) ?? sorted[sorted.length - 1]
  const isToday = shown?.date === today
  const outstanding = totalRemaining(pending)
  const goal = goals.find((g) => g.saved < g.target) ?? goals[0]
  const topInsights = insights.slice(0, 2)

  const profit = shown ? profitOf(shown) : 0
  const pct = shown ? margin(profit, shown.sales) : 0
  const barMax = shown ? Math.max(shown.sales, shown.expenses, 1) : 1
  const when = isToday ? 'today' : `on ${shown ? fmtDay(shown.date) : ''}`

  return (
    <div className="lm-stack">
      <section className="lm-hero">
        <div>
          <span className="lm-label terra">TODAY · BUSINESS PULSE</span>
          <h2>{business.name} at a glance.</h2>
          <p>Here’s what happened, and what might be worth your attention.</p>
        </div>
        <button type="button" className="lm-btn primary lg" onClick={() => onNavigate('checkup')}>
          <Plus size={18} aria-hidden="true" /> Record today
        </button>
      </section>

      {!shown ? (
        <EmptyState
          title="Nothing recorded yet"
          body="Tell Lumora what happened today and your business pulse will appear here."
          actionLabel="Record today"
          onAction={() => onNavigate('checkup')}
        />
      ) : (
        <section className="lm-card lm-pulse" aria-label="Business pulse">
          <div className="lm-card-head">
            <div>
              <span className="lm-label">{isToday ? 'TODAY' : `LATEST · ${fmtDay(shown.date).toUpperCase()}`}</span>
              <h3>Your business pulse</h3>
            </div>
            {!isToday && (
              <button type="button" className="lm-link" onClick={() => onNavigate('checkup')}>
                Record today →
              </button>
            )}
          </div>

          <div className="lm-pulse-main">
            <div className="lm-profit">
              <span>Estimated profit</span>
              <strong className={profit < 0 ? 'neg' : ''}>{fmtINR(profit)}</strong>
              <small>from {fmtINR(shown.sales)} sales</small>
            </div>

            <div className="lm-bars">
              <div className="lm-bar-row">
                <span>Sales</span>
                <div className="lm-bar-track">
                  <div className="lm-bar sales" style={{ width: `${(shown.sales / barMax) * 100}%` }} />
                </div>
                <strong>{fmtShort(shown.sales)}</strong>
              </div>
              <div className="lm-bar-row">
                <span>Expenses</span>
                <div className="lm-bar-track">
                  <div className="lm-bar expenses" style={{ width: `${(shown.expenses / barMax) * 100}%` }} />
                </div>
                <strong>{fmtShort(shown.expenses)}</strong>
              </div>
            </div>
          </div>

          <div className="lm-mini-stats">
            <div>
              <span>Margin</span>
              <strong>{shown.sales > 0 ? `${Math.round(pct)}%` : '–'}</strong>
            </div>
            <div>
              <span>Money received</span>
              <strong>{fmtINR(shown.paymentsReceived)}</strong>
            </div>
            <div>
              <span>Still pending</span>
              <strong>{fmtINR(outstanding)}</strong>
            </div>
          </div>

          <div className="lm-pulse-foot">
            <span>
              <i className={`lm-dot ${profit >= 0 ? 'good' : 'bad'}`} />
              {profit > 0
                ? `You made money ${when}`
                : profit < 0
                  ? `Expenses were higher than sales ${when}`
                  : `You broke even ${when}`}
            </span>
          </div>
        </section>
      )}

      <section>
        <div className="lm-section-head">
          <span className="lm-label terra">WHAT CHANGED</span>
          <h3>
            {topInsights[0]?.tone === 'info'
              ? 'Where things stand'
              : topInsights.length > 1
                ? 'A couple of things worth noticing'
                : 'One thing worth noticing'}
          </h3>
        </div>
        <div className="lm-stack tight">
          {topInsights.map((i) => (
            <InsightCard key={i.id} insight={i} onAsk={(q) => onNavigate('copilot', q)} />
          ))}
        </div>
      </section>

      <section className="lm-actions" aria-label="What you can do">
        <button type="button" className="lm-action primary" onClick={() => onNavigate('checkup')}>
          <span className="lm-action-top">
            <Plus size={20} aria-hidden="true" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <span className="lm-label">TODAY’S CHECK-UP</span>
          <strong>Tell Lumora what happened.</strong>
          <small>Record your numbers in under a minute.</small>
        </button>
        <button type="button" className="lm-action" onClick={() => onNavigate('copilot', insights[0]?.question)}>
          <span className="lm-action-top">
            <Sparkles size={20} aria-hidden="true" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <span className="lm-label">ASK LUMORA</span>
          <strong>Understand what changed.</strong>
          <small>Explore what your numbers are telling you.</small>
        </button>
        <button type="button" className="lm-action" onClick={() => onNavigate('pending')}>
          <span className="lm-action-top">
            <HandCoins size={20} aria-hidden="true" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <span className="lm-label">PENDING PAYMENTS</span>
          <strong>{outstanding > 0 ? `${fmtINR(outstanding)} to collect` : 'Nobody owes you'}</strong>
          <small>Review who still owes you money.</small>
        </button>
        <button type="button" className="lm-action" onClick={() => onNavigate('piggy')}>
          <span className="lm-action-top">
            <PiggyBank size={20} aria-hidden="true" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <span className="lm-label">PIGGY BANK</span>
          <strong>{goal ? `${goal.name} goal` : 'Start a savings goal'}</strong>
          <small>{goal ? `${Math.round(goalProgress(goal))}% saved so far.` : 'Save for something outside the business.'}</small>
        </button>
      </section>

      {goal && (
        <section>
          <div className="lm-section-head row">
            <div>
              <span className="lm-label terra">KEEPING AN EYE ON</span>
              <h3>A goal outside the business</h3>
            </div>
            <button type="button" className="lm-link" onClick={() => onNavigate('piggy')}>
              Open Piggy Bank →
            </button>
          </div>
          <button type="button" className="lm-card lm-goal-mini" onClick={() => onNavigate('piggy')}>
            <div className="lm-goal-mini-top">
              <div>
                <span className="lm-label">{goal.name.toUpperCase()} GOAL</span>
                <h3>{fmtINR(goal.saved)} saved</h3>
              </div>
              <strong>{Math.round(goalProgress(goal))}%</strong>
            </div>
            <div className="lm-progress">
              <div style={{ width: `${goalProgress(goal)}%` }} />
            </div>
            <div className="lm-goal-mini-bottom">
              <span>{fmtINR(goalRemaining(goal))} remaining</span>
              <span>Estimate: {goalEstimate(goal).text}</span>
            </div>
          </button>
        </section>
      )}

      <section className="lm-home-foot">
        <p>
          <strong>Small records become useful patterns.</strong>
          <br />
          Keep telling Lumora what happened.
        </p>
        <button
          type="button"
          className="lm-link muted"
          onClick={() => {
            if (window.confirm('Reset to the original demo data? Your recorded changes will be replaced.')) onResetDemo()
          }}
        >
          Reset demo data
        </button>
      </section>
    </div>
  )
}
