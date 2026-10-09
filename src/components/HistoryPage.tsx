import { useState } from 'react'
import type { DailyRecord, Page, PendingPayment } from '../types'
import {
  bestSalesDay,
  highestExpenseDay,
  pendingFlow,
  periodPair,
  profitOf,
  sumRecords,
  totalRemaining,
} from '../lib/calc'
import {
  addDays,
  fmtDay,
  fmtINR,
  fmtMonthShort,
  fmtShort,
  fmtSigned,
  fmtWeekday,
  fmtWeekdayShort,
  parseDate,
  todayStr,
} from '../lib/utils'
import { Delta, EmptyState } from './ui'

type Range = 'today' | 'week' | 'month' | 'year'

const RANGES: { id: Range; label: string; days: number; title: string; prev: string }[] = [
  { id: 'today', label: 'Today', days: 1, title: 'Today', prev: 'yesterday' },
  { id: 'week', label: 'Week', days: 7, title: 'Last 7 days', prev: 'the 7 days before' },
  { id: 'month', label: 'Month', days: 30, title: 'Last 30 days', prev: 'the 30 days before' },
  { id: 'year', label: 'Year', days: 365, title: 'Last 12 months', prev: 'the year before' },
]

type Bucket = { label: string; sales: number; expenses: number; tip: string }

function buildBuckets(range: Range, records: DailyRecord[], from: string, end: string): Bucket[] {
  if (range === 'today') return []
  if (range === 'year') {
    const map = new Map<string, Bucket>()
    for (const r of records) {
      const key = r.date.slice(0, 7)
      const b = map.get(key) ?? { label: fmtMonthShort(r.date), sales: 0, expenses: 0, tip: '' }
      b.sales += r.sales
      b.expenses += r.expenses
      b.tip = `${fmtMonthShort(r.date)}: sales ${fmtShort(b.sales)}, expenses ${fmtShort(b.expenses)}`
      map.set(key, b)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, b]) => b)
  }
  const byDate = new Map(records.map((r) => [r.date, r]))
  const out: Bucket[] = []
  for (let d = from; d <= end; d = addDays(d, 1)) {
    const r = byDate.get(d)
    const label = range === 'week' ? fmtWeekdayShort(d) : String(parseDate(d).getDate())
    out.push({
      label,
      sales: r?.sales ?? 0,
      expenses: r?.expenses ?? 0,
      tip: r ? `${fmtDay(d)}: sales ${fmtShort(r.sales)}, expenses ${fmtShort(r.expenses)}` : `${fmtDay(d)}: no record`,
    })
  }
  return out
}

function Chart({ buckets, range }: { buckets: Bucket[]; range: Range }) {
  const max = Math.max(1, ...buckets.flatMap((b) => [b.sales, b.expenses]))
  const step = range === 'month' ? 5 : 1
  return (
    <div>
      <div className="lm-legend">
        <span><i className="s" /> Sales</span>
        <span><i className="e" /> Expenses</span>
      </div>
      <div
        className={`lm-chart ${range}`}
        role="img"
        aria-label="Sales and expenses over time. Use the numbers below for exact values."
      >
        {buckets.map((b, i) => (
          <div key={`${b.label}-${i}`} className="lm-chart-col" title={b.tip}>
            <div className="lm-chart-bars">
              <i className="s" style={{ height: `${(b.sales / max) * 100}%` }} />
              <i className="e" style={{ height: `${(b.expenses / max) * 100}%` }} />
            </div>
            <span>{i % step === 0 ? b.label : ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HistoryPage({
  records,
  pending,
  onNavigate,
}: {
  records: DailyRecord[]
  pending: PendingPayment[]
  onNavigate: (page: Page, question?: string) => void
}) {
  const [range, setRange] = useState<Range>('week')
  const cfg = RANGES.find((r) => r.id === range) ?? RANGES[1]
  const end = todayStr()

  const { cur, prev, curFrom, prevFrom, prevTo } = periodPair(records, cfg.days, end)
  const t = sumRecords(cur)
  const pt = sumRecords(prev)
  const hasPrev = prev.length > 0
  const flow = pendingFlow(pending, curFrom, end)
  const prevFlow = pendingFlow(pending, prevFrom, prevTo)
  const best = bestSalesDay(cur)
  const worst = highestExpenseDay(cur)
  const avgProfit = t.days ? t.profit / t.days : 0
  const buckets = buildBuckets(range, cur, curFrom, end)
  const recent = [...cur].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)

  return (
    <div className="lm-stack">
      <div className="lm-seg" role="tablist" aria-label="Time range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={range === r.id}
            className={range === r.id ? 'on' : ''}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {cur.length === 0 ? (
        <EmptyState
          title={range === 'today' ? 'Nothing recorded today yet' : 'No records in this period'}
          body="Record your numbers in Today’s Check-up and they’ll show up here."
          actionLabel="Record today"
          onAction={() => onNavigate('checkup')}
        />
      ) : (
        <>
          <section className="lm-card">
            <div className="lm-card-head">
              <div>
                <span className="lm-label">{cfg.title.toUpperCase()}</span>
                <h3>
                  {fmtINR(t.profit)} <span className="lm-soft">estimated profit</span>
                </h3>
              </div>
              <Delta cur={t.profit} prev={pt.profit} hasPrev={hasPrev} />
            </div>

            <div className="lm-metric-grid">
              <div>
                <span>Sales</span>
                <strong>{fmtINR(t.sales)}</strong>
                <Delta cur={t.sales} prev={pt.sales} hasPrev={hasPrev} />
              </div>
              <div>
                <span>Expenses</span>
                <strong>{fmtINR(t.expenses)}</strong>
                <Delta cur={t.expenses} prev={pt.expenses} hasPrev={hasPrev} upIsGood={false} />
              </div>
              <div>
                <span>Pending now</span>
                <strong>{fmtINR(totalRemaining(pending))}</strong>
                <button type="button" className="lm-link small" onClick={() => onNavigate('pending')}>
                  View →
                </button>
              </div>
            </div>
            {hasPrev && <p className="lm-footnote">Changes compare with {cfg.prev}.</p>}
          </section>

          {buckets.length > 1 && (
            <section className="lm-card">
              <div className="lm-card-head">
                <h3>Sales and expenses</h3>
              </div>
              <Chart buckets={buckets} range={range} />
            </section>
          )}

          <section className="lm-card">
            <div className="lm-card-head">
              <h3>The details</h3>
            </div>
            <dl className="lm-detail-list">
              <div>
                <dt>Average daily profit</dt>
                <dd>{fmtINR(avgProfit)}</dd>
              </div>
              {best && (
                <div>
                  <dt>Strongest sales day</dt>
                  <dd>
                    {fmtINR(best.sales)} <small>{fmtWeekday(best.date)}, {fmtDay(best.date)}</small>
                  </dd>
                </div>
              )}
              {worst && (
                <div>
                  <dt>Highest-expense day</dt>
                  <dd>
                    {fmtINR(worst.expenses)} <small>{fmtWeekday(worst.date)}, {fmtDay(worst.date)}</small>
                  </dd>
                </div>
              )}
              <div>
                <dt>Pending payment change</dt>
                <dd>
                  {fmtSigned(flow.net)}{' '}
                  <small>
                    {fmtShort(flow.given)} given · {fmtShort(flow.received)} received
                    {hasPrev ? ` (before: ${fmtSigned(prevFlow.net)})` : ''}
                  </small>
                </dd>
              </div>
            </dl>
          </section>

          {range !== 'year' && (
            <section className="lm-card">
              <div className="lm-card-head">
                <h3>Day by day</h3>
              </div>
              <ul className="lm-day-list">
                {recent.map((r) => (
                  <li key={r.date}>
                    <div>
                      <strong>{fmtWeekday(r.date)}</strong>
                      <span>{fmtDay(r.date)}</span>
                    </div>
                    <div className="lm-day-nums">
                      <span>{fmtShort(r.sales)} sales</span>
                      <span>{fmtShort(r.expenses)} spent</span>
                      <strong className={profitOf(r) < 0 ? 'neg' : ''}>{fmtShort(profitOf(r))}</strong>
                    </div>
                    {r.note && <p className="lm-day-note">“{r.note}”</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button type="button" className="lm-btn ghost block" onClick={() => onNavigate('copilot', 'What changed this week?')}>
            Ask Copilot what changed
          </button>
        </>
      )}
    </div>
  )
}
