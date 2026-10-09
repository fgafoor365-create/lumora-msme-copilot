import { useState } from 'react'
import type { SavingsGoal } from '../types'
import { goalEstimate, goalPace, goalProgress, goalRemaining, savedInLastDays } from '../lib/calc'
import { fmtDay, fmtINR, fmtShort, toNumber } from '../lib/utils'
import { AmountField } from './ui'

type Props = {
  goals: SavingsGoal[]
  onAddGoal: (g: { name: string; target: number; saved: number; monthlyContribution?: number }) => void
  onContribute: (id: string, amount: number) => void
}

const PRESETS = ['Bike', 'Car', 'Home improvement', 'Emergency fund', 'Phone', 'Shop equipment', 'Education', 'Travel']

function Ring({ percent }: { percent: number }) {
  const r = 46
  const c = 2 * Math.PI * r
  return (
    <svg className="lm-ring" viewBox="0 0 120 120" role="img" aria-label={`${Math.round(percent)}% saved`}>
      <circle cx="60" cy="60" r={r} className="track" />
      <circle
        cx="60"
        cy="60"
        r={r}
        className="fill"
        strokeDasharray={c}
        strokeDashoffset={c - (c * percent) / 100}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="58" textAnchor="middle" className="pct">{Math.round(percent)}%</text>
      <text x="60" y="76" textAnchor="middle" className="sub">saved</text>
    </svg>
  )
}

function GoalCard({ goal, onContribute }: { goal: SavingsGoal; onContribute: Props['onContribute'] }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const progress = goalProgress(goal)
  const pace = goalPace(goal)
  const est = goalEstimate(goal)
  const last30 = savedInLastDays(goal, 30)
  const planned = goal.monthlyContribution ?? 0
  const behind = planned > 0 && goal.saved < goal.target && last30 < planned * 0.8
  const history = [...goal.contributions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  const add = () => {
    const n = toNumber(amount)
    if (n <= 0) return setError('Add an amount to set aside.')
    onContribute(goal.id, n)
    setAmount('')
    setError('')
  }

  return (
    <article className="lm-card lm-goal">
      <div className="lm-goal-top">
        <Ring percent={progress} />
        <div className="lm-goal-info">
          <span className="lm-label">{goal.name.toUpperCase()}</span>
          <h3>{fmtINR(goal.saved)}</h3>
          <span className="lm-soft">of {fmtINR(goal.target)}</span>
        </div>
      </div>

      <dl className="lm-detail-list">
        <div>
          <dt>Remaining</dt>
          <dd>{fmtINR(goalRemaining(goal))}</dd>
        </div>
        <div>
          <dt>Current pace</dt>
          <dd>{pace ? `${fmtINR(pace)} / month` : 'Not enough history yet'}</dd>
        </div>
        <div>
          <dt>Estimated time</dt>
          <dd>{est.text}</dd>
        </div>
      </dl>
      <p className="lm-footnote">Estimates simply follow your pace. They’re not promises, and they shift as you save.</p>

      {behind && (
        <p className="lm-gentle">
          You’ve set aside {fmtINR(last30)} in the last 30 days, a little under the {fmtINR(planned)} you planned. No pressure; the estimate just moves with your pace.
        </p>
      )}

      {goal.saved < goal.target && (
        <div className="lm-sub">
          <AmountField
            id={`add-${goal.id}`}
            label="Set something aside"
            value={amount}
            onChange={setAmount}
            chips={[500, 1000, 2000, 5000]}
          />
          {error && <p className="lm-errors" role="alert">{error}</p>}
          <button type="button" className="lm-btn primary" onClick={add}>Add to {goal.name}</button>
        </div>
      )}

      {history.length > 0 && (
        <ul className="lm-day-list compact">
          {history.map((c, i) => (
            <li key={`${c.date}-${i}`}>
              <span>{fmtDay(c.date)}</span>
              <strong>+{fmtShort(c.amount)}</strong>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export default function PiggyPage({ goals, onAddGoal, onContribute }: Props) {
  const [showForm, setShowForm] = useState(goals.length === 0)
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [monthly, setMonthly] = useState('')
  const [startSaved, setStartSaved] = useState('')
  const [error, setError] = useState('')

  const create = () => {
    const t = toNumber(target)
    if (!name.trim()) return setError('Pick or type what you’re saving for.')
    if (t <= 0) return setError('Add a target amount.')
    const m = toNumber(monthly)
    onAddGoal({ name, target: t, saved: toNumber(startSaved), ...(m > 0 ? { monthlyContribution: m } : {}) })
    setName('')
    setTarget('')
    setMonthly('')
    setStartSaved('')
    setError('')
    setShowForm(false)
  }

  return (
    <div className="lm-stack">
      <section className="lm-hero compact">
        <div>
          <span className="lm-label terra">PIGGY BANK</span>
          <h2>Savings, separate from the business.</h2>
          <p>Goals for you and your business. Calm and at your own pace.</p>
        </div>
        <button type="button" className="lm-btn ghost" onClick={() => setShowForm((v) => !v)} aria-expanded={showForm}>
          {showForm ? 'Close' : 'New goal'}
        </button>
      </section>

      {showForm && (
        <section className="lm-card lm-form">
          <h3>What are you saving for?</h3>
          <div className="lm-chips left wrap" role="group" aria-label="Goal ideas">
            {PRESETS.map((p) => (
              <button key={p} type="button" className={`lm-chip ${name === p ? 'on' : ''}`} onClick={() => setName(p)}>
                {p}
              </button>
            ))}
          </div>
          <div className="lm-field">
            <label htmlFor="goal-name" className="lm-field-label">Or type your own</label>
            <input id="goal-name" className="lm-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. New scooter" autoComplete="off" />
          </div>
          <AmountField id="goal-target" label="Target amount" value={target} onChange={setTarget} chips={[25000, 50000, 100000, 200000]} />
          <AmountField id="goal-start" label="Already saved (optional)" value={startSaved} onChange={setStartSaved} />
          <AmountField id="goal-monthly" label="Monthly amount you plan to set aside (optional)" value={monthly} onChange={setMonthly} chips={[2000, 5000, 10000]} />
          {error && <p className="lm-errors" role="alert">{error}</p>}
          <button type="button" className="lm-btn primary block" onClick={create}>Create goal</button>
        </section>
      )}

      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} onContribute={onContribute} />
      ))}
    </div>
  )
}
