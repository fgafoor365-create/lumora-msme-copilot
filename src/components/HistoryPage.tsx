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
import { useI18n } from '../lib/i18n'
import { translate, type LumoraLanguage } from '../lib/i18n'

type Range = 'today' | 'week' | 'month' | 'year'

const RANGES: { id: Range; label: string; days: number; title: string; prev: string }[] = [
  { id: 'today', label: 'today', days: 1, title: 'today', prev: 'yesterday' },
  { id: 'week', label: 'week', days: 7, title: 'last7Days', prev: 'the 7 days before' },
  { id: 'month', label: 'month', days: 30, title: 'last30Days', prev: 'the 30 days before' },
  { id: 'year', label: 'year', days: 365, title: 'last12Months', prev: 'the year before' },
]

type Bucket = { label: string; sales: number; expenses: number; tip: string }

function buildBuckets(range: Range, records: DailyRecord[], from: string, end: string, language: LumoraLanguage): Bucket[] {
  if (range === 'today') return []
  
  if (range === 'year') {
    const map = new Map<string, Bucket>()

    // Create all 12 months, even when there are no records.
    for (let offset = 11; offset >= 0; offset--) {
      const date = addDays(end, -offset * 30)
      const key = date.slice(0, 7)
      const monthDate = `${key}-01`

      map.set(key, {
        label: fmtMonthShort(monthDate),
        sales: 0,
        expenses: 0,
        tip: `${fmtMonthShort(monthDate)}: ${translate(language, 'noRecord')}`,
      })
    }

    for (const record of records) {
      const key = record.date.slice(0, 7)
      const bucket = map.get(key)

      if (!bucket) continue

      bucket.sales += record.sales
      bucket.expenses += record.expenses
      bucket.tip = `${bucket.label}: ${translate(language, 'sales')} ${fmtShort(bucket.sales)}, ${translate(language, 'expenses')} ${fmtShort(bucket.expenses)}`
    }

    return [...map.values()]
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
      tip: r ? `${fmtDay(d)}: ${translate(language, 'sales')} ${fmtShort(r.sales)}, ${translate(language, 'expenses')} ${fmtShort(r.expenses)}` : `${fmtDay(d)}: ${translate(language, 'noRecord')}`,
    })
  }
  return out
}

function Chart({ buckets, range, language }: { buckets: Bucket[]; range: Range; language: LumoraLanguage }) {
  const max = Math.max(1, ...buckets.flatMap((b) => [b.sales, b.expenses]))
  const step = range === 'month' ? 5 : 1
  return (
    <div>
      <div className="lm-legend">
        <span><i className="s" /> {translate(language, 'sales')}</span>
        <span><i className="e" /> {translate(language, 'expenses')}</span>
      </div>
      <div
        className={`lm-chart ${range}`}
        role="img"
        aria-label={`${translate(language, 'salesExpenses')}. ${translate(language, 'basedOnRecords')}.`}
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
  const { t: tr, language } = useI18n()
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
  const buckets = buildBuckets(range, cur, curFrom, end, language)
  const recent = [...cur].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7)

  return (
    <div className="lm-stack">
      <div className="lm-seg" role="tablist" aria-label={tr('historyRange')}>
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={range === r.id}
            className={range === r.id ? 'on' : ''}
            onClick={() => setRange(r.id)}
          >
            {tr(r.label as 'today' | 'week' | 'month' | 'year')}
          </button>
        ))}
      </div>

      {cur.length === 0 ? (
        <EmptyState
          title={range === 'today' ? tr('nothingRecordedToday') : tr('noRecordPeriod')}
          body={tr('recordInCheckup')}
          actionLabel={tr('recordToday')}
          onAction={() => onNavigate('checkup')}
        />
      ) : (
        <>
          <section className="lm-card">
            <div className="lm-card-head">
              <div>
                <span className="lm-label">{tr(cfg.title as 'today' | 'last7Days' | 'last30Days' | 'last12Months').toUpperCase()}</span>
                <h3>
                  {fmtINR(t.profit)} <span className="lm-soft">{tr('estimatedProfitLabel')}</span>
                </h3>
              </div>
              <Delta cur={t.profit} prev={pt.profit} hasPrev={hasPrev} />
            </div>

            <div className="lm-metric-grid">
              <div>
                <span>{tr('sales')}</span>
                <strong>{fmtINR(t.sales)}</strong>
                <Delta cur={t.sales} prev={pt.sales} hasPrev={hasPrev} />
              </div>
              <div>
                <span>{tr('expenses')}</span>
                <strong>{fmtINR(t.expenses)}</strong>
                <Delta cur={t.expenses} prev={pt.expenses} hasPrev={hasPrev} upIsGood={false} />
              </div>
              <div>
                <span>{tr('pendingNow')}</span>
                <strong>{fmtINR(totalRemaining(pending))}</strong>
                <button type="button" className="lm-link small" onClick={() => onNavigate('pending')}>
                  {tr('view')} →
                </button>
              </div>
            </div>
            {hasPrev && <p className="lm-footnote">{tr('changesCompare', { period: cfg.prev })}</p>}
          </section>

          {buckets.length > 1 && (
            <section className="lm-card">
              <div className="lm-card-head">
                <h3>{tr('salesExpenses')}</h3>
              </div>
              <Chart buckets={buckets} range={range} language={language} />
            </section>
          )}

          <section className="lm-card">
            <div className="lm-card-head">
              <h3>{tr('details')}</h3>
            </div>
            <dl className="lm-detail-list">
              <div>
              <dt>{tr('averageDailyProfit')}</dt>
                <dd>{fmtINR(avgProfit)}</dd>
              </div>
              {best && (
                <div>
                    <dt>{tr('strongestSalesDay')}</dt>
                  <dd>
                    {fmtINR(best.sales)} <small>{fmtWeekday(best.date)}, {fmtDay(best.date)}</small>
                  </dd>
                </div>
              )}
              {worst && (
                <div>
                    <dt>{tr('highestExpenseDay')}</dt>
                  <dd>
                    {fmtINR(worst.expenses)} <small>{fmtWeekday(worst.date)}, {fmtDay(worst.date)}</small>
                  </dd>
                </div>
              )}
              <div>
                <dt>{tr('pendingChange')}</dt>
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
              <h3>{tr('dayByDay')}</h3>
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
          {tr('askCopilotChanges')}
          </button>
        </>
      )}
    </div>
  )
}
