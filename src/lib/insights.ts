import type { DailyRecord, Insight, PendingPayment } from '../types'
import { translate, type LumoraLanguage, type TranslationKey } from './i18n'
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
export function getInsights(records: DailyRecord[], pending: PendingPayment[], language: LumoraLanguage = 'en'): Insight[] {
  const t = (key: TranslationKey, values?: Record<string, string | number>) => translate(language, key, values)
  const locale = `${language}-IN`
  const sorted = sortByDate(records)

  if (sorted.length < 7) {
    return [
      {
        id: 'getting-started',
        tone: 'info',
        label: t('dashInsightStartedLabel'),
        title: t('dashInsightStartedTitle'),
        body: t('dashInsightStartedBody'),
        facts: [{ label: t('dashDaysRecorded'), value: String(sorted.length) }],
        question: 'What should I pay attention to?',
      },
    ]
  }

  const out: Insight[] = []
  const latest = sorted[sorted.length - 1]
  const isToday = latest.date === todayStr()
  const day = fmtDay(latest.date, locale)
  const when = isToday ? t('today') : t('dashOnDate', { date: day })
  const whenLabel = isToday ? t('today') : day
  const history = sorted.slice(0, -1).slice(-14)

  /* 1. Unusually high expenses on the latest day */
  if (history.length >= 5) {
    const usual = Math.round(avg(history.map((r) => r.expenses)) / 100) * 100
    const diff = latest.expenses - usual
    if (usual > 0 && diff >= usual * 0.25) {
      out.push({
        id: 'high-expenses',
        tone: 'warn',
        label: t('dashInsightExpensesLabel'),
        title: isToday ? t('dashInsightHighExpenseToday') : t('dashInsightHighExpenseDate', { when }),
        body: t('dashInsightHighExpenseBody', {
          spent: fmtINR(latest.expenses), when, usual: fmtINR(usual), difference: fmtINR(diff),
        }),
        facts: [
          { label: t('dashUsual'), value: fmtINR(usual) },
          { label: whenLabel, value: fmtINR(latest.expenses) },
          { label: t('dashDifference'), value: fmtSigned(diff), strong: true },
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
      { label: t('sales'), value: `${fmtShort(c.sales)}${salesPct !== null ? ` (${fmtPct(salesPct)})` : ''}` },
      { label: t('expenses'), value: `${fmtShort(c.expenses)} (${fmtSigned(ed)})` },
      { label: t('estimatedProfit'), value: `${fmtShort(c.profit)} (${fmtSigned(pd)})`, strong: true },
    ]

    if (sd > 0 && ed > sd && pd < 0) {
      out.push({
        id: 'profit-pressure',
        tone: 'warn',
        label: t('dashInsightProfitLabel'),
        title: t('dashInsightProfitTitle'),
        body: t('dashInsightProfitBody', {
          salesChange: fmtINR(sd), expenseChange: fmtINR(ed), profitChange: fmtINR(-pd),
        }),
        facts: factsWeek,
        question: 'Bhai, mera profit kyun kam hua?',
      })
    } else if (salesPct !== null && salesPct <= -10) {
      out.push({
        id: 'sales-drop',
        tone: 'warn',
        label: t('dashInsightSalesLabel'),
        title: t('dashInsightSalesLowTitle'),
        body: t('dashInsightSalesBody', { sales: fmtINR(c.sales), previousSales: fmtINR(p.sales), change: fmtPct(salesPct) }),
        facts: factsWeek,
        question: 'How are my sales doing?',
      })
    } else if (salesPct !== null && salesPct >= 10) {
      out.push({
        id: 'sales-up',
        tone: 'good',
        label: t('dashInsightSalesLabel'),
        title: t('dashInsightSalesHighTitle'),
        body: t('dashInsightSalesBody', { sales: fmtINR(c.sales), previousSales: fmtINR(p.sales), change: fmtPct(salesPct) }),
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
        label: t('dashInsightPendingLabel'),
        title: t('dashInsightPendingTitle'),
        body: t('dashInsightPendingBody', {
          given: fmtINR(flowCur.given), received: fmtINR(flowCur.received),
          net: fmtINR(flowCur.net), previousNet: fmtSigned(flowPrev.net),
        }),
        facts: [
          { label: t('creditGiven'), value: fmtShort(flowCur.given) },
          { label: t('received'), value: fmtShort(flowCur.received) },
          { label: t('stillPending'), value: fmtShort(totalRemaining(pending)), strong: true },
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
        label: t('dashInsightSalesLabel'),
        title: isToday ? t('dashInsightStrongToday') : t('dashInsightStrongDate', { when }),
        body: t('dashInsightStrongBody', { sales: fmtINR(latest.sales), when, usualSales: fmtINR(usualSales), difference: fmtINR(diff) }),
        facts: [
          { label: t('dashUsual'), value: fmtINR(usualSales) },
          { label: whenLabel, value: fmtINR(latest.sales) },
          { label: t('dashDifference'), value: fmtSigned(diff), strong: true },
        ],
        question: 'Which day was strongest?',
      })
    }
  }

  if (!out.length) {
    out.push({
      id: 'steady',
      tone: 'info',
      label: t('dashInsightSteadyLabel'),
      title: t('dashInsightSteadyTitle'),
      body: t('dashInsightSteadyBody'),
      facts: [],
      question: 'What changed this week?',
    })
  }

  return out
}
