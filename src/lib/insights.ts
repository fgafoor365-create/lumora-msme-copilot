import type { DailyRecord, Insight, PendingPayment } from '../types'
import {
  pendingFlow,
  periodPair,
  sortByDate,
  sumRecords,
  totalRemaining,
} from './calc'
import { fmtDay, fmtINR, fmtPct, fmtShort, fmtSigned, pctChange, todayStr } from './utils'

const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0)

/**
 * Deterministic, evidence-based insights.
 * Every insight is built only from recorded numbers. Nothing is guessed.
 */
export function getInsights(records: DailyRecord[], pending: PendingPayment[]): Insight[] {
  const sorted = sortByDate(records)

  if (sorted.length < 7) {
    return [
      {
        id: 'getting-started',
        tone: 'info',
        label: 'GETTING STARTED',
        title: "You're just getting started.",
        body: 'Keep recording your business and Lumora will have more useful patterns to show you.',
        facts: [{ label: 'Days recorded', value: String(sorted.length) }],
        question: 'What should I pay attention to?',
      },
    ]
  }

  const out: Insight[] = []
  const latest = sorted[sorted.length - 1]
  const isToday = latest.date === todayStr()
  const when = isToday ? 'today' : `on ${fmtDay(latest.date)}`
  const whenLabel = isToday ? 'Today' : fmtDay(latest.date)
  const history = sorted.slice(0, -1).slice(-14)

  /* 1. Unusually high expenses on the latest day */
  if (history.length >= 5) {
    const usual = Math.round(avg(history.map((r) => r.expenses)) / 100) * 100
    const diff = latest.expenses - usual
    if (usual > 0 && diff >= usual * 0.25) {
      out.push({
        id: 'high-expenses',
        tone: 'warn',
        label: 'EXPENSES',
        title: isToday
          ? 'Your expenses are higher than usual today.'
          : `Your expenses were higher than usual ${when}.`,
        body: `You spent ${fmtINR(latest.expenses)} ${when} compared with your usual ${fmtINR(usual)}. That's ${fmtINR(diff)} more than usual.`,
        facts: [
          { label: 'Usual', value: fmtINR(usual) },
          { label: whenLabel, value: fmtINR(latest.expenses) },
          { label: 'Difference', value: fmtSigned(diff), strong: true },
        ],
        note: latest.note,
        question: 'Why am I spending so much?',
      })
    }
  }

  /* 2. Week-over-week comparisons */
  const { cur, prev, curFrom, prevFrom, prevTo } = periodPair(sorted, 7, latest.date)
  if (cur.length >= 5 && prev.length >= 5) {
    const c = sumRecords(cur)
    const p = sumRecords(prev)
    const sd = c.sales - p.sales
    const ed = c.expenses - p.expenses
    const pd = c.profit - p.profit
    const salesPct = pctChange(c.sales, p.sales)

    const factsWeek = [
      { label: 'Sales', value: `${fmtShort(c.sales)}${salesPct !== null ? ` (${fmtPct(salesPct)})` : ''}` },
      { label: 'Expenses', value: `${fmtShort(c.expenses)} (${fmtSigned(ed)})` },
      { label: 'Profit', value: `${fmtShort(c.profit)} (${fmtSigned(pd)})`, strong: true },
    ]

    if (sd > 0 && ed > sd && pd < 0) {
      out.push({
        id: 'profit-pressure',
        tone: 'warn',
        label: 'PROFIT',
        title: 'Your sales increased, but expenses increased faster.',
        body: `Over the last 7 days sales rose by ${fmtINR(sd)}, but expenses rose by ${fmtINR(ed)}, so estimated profit is ${fmtINR(-pd)} lower than the 7 days before.`,
        facts: factsWeek,
        question: 'Bhai, mera profit kyun kam hua?',
      })
    } else if (salesPct !== null && salesPct <= -10) {
      out.push({
        id: 'sales-drop',
        tone: 'warn',
        label: 'SALES',
        title: 'Sales are lower than your recent average.',
        body: `Sales over the last 7 days were ${fmtINR(c.sales)}, compared with ${fmtINR(p.sales)} in the 7 days before (${fmtPct(salesPct)}).`,
        facts: factsWeek,
        question: 'How are my sales doing?',
      })
    } else if (salesPct !== null && salesPct >= 10) {
      out.push({
        id: 'sales-up',
        tone: 'good',
        label: 'SALES',
        title: 'Sales are higher than your recent average.',
        body: `Sales over the last 7 days were ${fmtINR(c.sales)}, compared with ${fmtINR(p.sales)} in the 7 days before (${fmtPct(salesPct)}).`,
        facts: factsWeek,
        question: 'How are my sales doing?',
      })
    }

    /* 3. Pending payments building up */
    const flowCur = pendingFlow(pending, curFrom, latest.date)
    const flowPrev = pendingFlow(pending, prevFrom, prevTo)
    if (flowCur.net >= 1000 && flowCur.net > flowPrev.net) {
      out.push({
        id: 'pending-building',
        tone: 'warn',
        label: 'PENDING PAYMENTS',
        title: 'Pending payments are building up.',
        body: `In the last 7 days you gave ${fmtINR(flowCur.given)} on credit and received ${fmtINR(flowCur.received)} back, so ${fmtINR(flowCur.net)} was added to what customers owe. The 7 days before, the change was ${fmtSigned(flowPrev.net)}.`,
        facts: [
          { label: 'Credit given', value: fmtShort(flowCur.given) },
          { label: 'Received', value: fmtShort(flowCur.received) },
          { label: 'Still pending', value: fmtShort(totalRemaining(pending)), strong: true },
        ],
        question: 'How much money is still pending?',
      })
    }
  }

  /* 4. Unusually strong sales day */
  if (history.length >= 5) {
    const usualSales = Math.round(avg(history.map((r) => r.sales)) / 100) * 100
    const diff = latest.sales - usualSales
    if (usualSales > 0 && diff >= usualSales * 0.25) {
      out.push({
        id: 'strong-day',
        tone: 'good',
        label: 'SALES',
        title: isToday ? 'Sales were strong today.' : `Sales were strong ${when}.`,
        body: `You sold ${fmtINR(latest.sales)} ${when} compared with your usual ${fmtINR(usualSales)}. That's ${fmtINR(diff)} more than usual.`,
        facts: [
          { label: 'Usual', value: fmtINR(usualSales) },
          { label: whenLabel, value: fmtINR(latest.sales) },
          { label: 'Difference', value: fmtSigned(diff), strong: true },
        ],
        question: 'Which day was strongest?',
      })
    }
  }

  if (!out.length) {
    out.push({
      id: 'steady',
      tone: 'info',
      label: 'ALL STEADY',
      title: 'Nothing unusual in your recent records.',
      body: 'Your sales, expenses and pending payments are close to your usual pattern.',
      facts: [],
      question: 'What changed this week?',
    })
  }

  return out
}
