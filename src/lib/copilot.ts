import type { CopilotAnswer, CopilotContext, NumberChip } from '../types'
import {
  bestSalesDay,
  bestWeekday,
  highestExpenseDay,
  inRange,
  latestDate,
  openPayments,
  paidOf,
  pendingFlow,
  periodPair,
  remainingOf,
  sumRecords,
  totalRemaining,
  type Totals,
} from './calc'
import { getInsights } from './insights'
import {
  addDays,
  daysBetween,
  fmtDay,
  fmtINR,
  fmtPct,
  fmtShort,
  fmtWeekday,
  margin,
  pctChange,
  todayStr,
} from './utils'

/**
 * Deterministic Copilot. It only reads application state.
 * A real AI service can later be plugged in by replacing `askCopilot`
 * with a function that explains these same structured answers.
 */

export const suggestedQuestions = [
  'Bhai, mera profit kyun kam hua?',
  'Why am I spending so much?',
  'Last month se kya difference hai?',
  'Which day was strongest?',
  'How much money is still pending?',
  'Am I actually making money?',
  'What changed this week?',
  'Should I be worried about my expenses?',
]

const arrow = (n: number) => (n > 0 ? '↑' : n < 0 ? '↓' : '→')

function needMore(): CopilotAnswer {
  return {
    noticed: "I can't confidently explain that yet.",
    why: "Keep recording your business and I'll have more information to work with.",
    action: { label: "Record today's numbers", page: 'checkup' },
    followUps: ['How much money is still pending?'],
    insufficient: true,
  }
}

type Comparison = {
  cur: Totals
  prev: Totals
  curRecords: ReturnType<typeof periodPair>['cur']
  label: string
  prevLabel: string
}

function buildComparison(ctx: CopilotContext, days: 7 | 30): Comparison | null {
  if (!ctx.records.length) return null
  const end = latestDate(ctx.records)
  const pair = periodPair(ctx.records, days, end)
  const min = days === 7 ? 3 : 7
  if (pair.cur.length < min || pair.prev.length < min) return null
  return {
    cur: sumRecords(pair.cur),
    prev: sumRecords(pair.prev),
    curRecords: pair.cur,
    label: `the last ${days} days`,
    prevLabel: `the ${days} days before`,
  }
}

function headline(sd: number, ed: number, pd: number): string {
  if (pd < 0) {
    if (sd > 0) return 'Sales increased, but expenses increased faster.'
    if (ed >= 0) return `${sd < 0 ? 'Sales dipped' : 'Sales stayed flat'} while expenses did not come down.`
    return 'Sales fell by more than expenses did.'
  }
  if (pd > 0) {
    if (sd > 0 && ed <= 0) return 'Sales grew while expenses came down.'
    if (sd > 0) return 'Sales grew faster than expenses.'
    return 'Expenses came down by more than sales did.'
  }
  return 'Your estimated profit is about the same.'
}

function explainChange(c: Comparison): string {
  const sd = c.cur.sales - c.prev.sales
  const ed = c.cur.expenses - c.prev.expenses
  const pd = c.cur.profit - c.prev.profit
  const sp = pctChange(c.cur.sales, c.prev.sales)
  const pctText = sp !== null ? ` (${fmtPct(sp)})` : ''

  const salesPart =
    sd > 0
      ? `Sales increased by ${fmtINR(sd)}${pctText}`
      : sd < 0
        ? `Sales decreased by ${fmtINR(-sd)}${pctText}`
        : 'Sales stayed about the same'
  const expPart =
    ed > 0
      ? `expenses increased by ${fmtINR(ed)}`
      : ed < 0
        ? `expenses decreased by ${fmtINR(-ed)}`
        : 'expenses stayed about the same'

  let sentence: string
  if (pd < 0) {
    if (sd > 0 && ed > sd) {
      sentence = `${salesPart}, but ${expPart}. Expenses grew faster than sales, so estimated profit fell by ${fmtINR(-pd)}.`
    } else if (sd <= 0 && ed >= 0) {
      sentence = `${salesPart} while ${expPart}, so estimated profit fell by ${fmtINR(-pd)}.`
    } else if (sd < 0 && ed < 0) {
      sentence = `${salesPart}, and ${expPart}, but sales dropped by more than expenses, so estimated profit fell by ${fmtINR(-pd)}.`
    } else {
      sentence = `${salesPart} and ${expPart}, so estimated profit fell by ${fmtINR(-pd)}.`
    }
  } else if (pd > 0) {
    if (sd > 0 && ed <= 0) {
      sentence = `${salesPart} while ${expPart}, so estimated profit rose by ${fmtINR(pd)}.`
    } else if (sd > 0) {
      sentence = `${salesPart}, and ${expPart}, but sales grew faster, so estimated profit rose by ${fmtINR(pd)}.`
    } else {
      sentence = `${salesPart}, but ${expPart} by more, so estimated profit rose by ${fmtINR(pd)}.`
    }
  } else {
    sentence = `${salesPart} and ${expPart}, so estimated profit is about the same.`
  }
  return `Comparing ${c.label} with ${c.prevLabel}. ${sentence}`
}

function comparisonNumbers(c: Comparison): NumberChip[] {
  const sd = c.cur.sales - c.prev.sales
  const ed = c.cur.expenses - c.prev.expenses
  const pd = c.cur.profit - c.prev.profit
  const sp = pctChange(c.cur.sales, c.prev.sales)
  return [
    {
      label: 'Sales',
      value: fmtShort(c.cur.sales),
      delta: sd === 0 ? 'no change' : sp !== null ? `${arrow(sd)} ${Math.abs(Math.round(sp))}%` : `${arrow(sd)} ${fmtShort(Math.abs(sd))}`,
      tone: sd > 0 ? 'good' : sd < 0 ? 'warn' : 'info',
    },
    {
      label: 'Expenses',
      value: fmtShort(c.cur.expenses),
      delta: ed === 0 ? 'no change' : `${arrow(ed)} ${fmtShort(Math.abs(ed))}`,
      tone: ed > 0 ? 'warn' : ed < 0 ? 'good' : 'info',
    },
    {
      label: 'Profit',
      value: fmtShort(c.cur.profit),
      delta: pd === 0 ? 'no change' : `${arrow(pd)} ${fmtShort(Math.abs(pd))}`,
      tone: pd > 0 ? 'good' : pd < 0 ? 'warn' : 'info',
    },
  ]
}

/** Only mentions a note when the user actually recorded one on a high-spend day. */
function noteEvidence(c: Comparison): string | undefined {
  const avgExp = c.cur.days ? c.cur.expenses / c.cur.days : 0
  const d = c.curRecords
    .filter((r) => r.note && r.expenses > avgExp)
    .sort((a, b) => b.expenses - a.expenses)[0]
  return d ? `On ${fmtDay(d.date)} you spent ${fmtINR(d.expenses)} and noted: “${d.note}”.` : undefined
}

function profitWhy(ctx: CopilotContext, days: 7 | 30, neutral = false): CopilotAnswer {
  const c = buildComparison(ctx, days)
  if (!c) return needMore()
  const sd = c.cur.sales - c.prev.sales
  const ed = c.cur.expenses - c.prev.expenses
  const pd = c.cur.profit - c.prev.profit

  let noticed = headline(sd, ed, pd)
  if (!neutral && pd > 0) noticed = `Your estimated profit didn't fall; it rose. ${noticed}`

  return {
    noticed,
    why: explainChange(c),
    extra: pd < 0 && ed > 0 ? noteEvidence(c) : undefined,
    numbers: comparisonNumbers(c),
    action:
      pd < 0 && ed > 0
        ? {
            label: 'See day-by-day spending',
            page: 'history',
            detail:
              "Look at which days your expenses were highest. When something unusual happens, add a note in Today's Check-up so I can point to it next time.",
          }
        : { label: 'Open History', page: 'history' },
    followUps: ['Why am I spending so much?', 'Which day was strongest?', 'How much money is still pending?'],
  }
}

function expensesAnswer(ctx: CopilotContext): CopilotAnswer {
  const c = buildComparison(ctx, 7)
  if (!c) return needMore()
  const ratio = c.cur.sales > 0 ? (c.cur.expenses / c.cur.sales) * 100 : null
  const prevRatio = c.prev.sales > 0 ? (c.prev.expenses / c.prev.sales) * 100 : null
  const ed = c.cur.expenses - c.prev.expenses
  const high = highestExpenseDay(c.curRecords)

  let why = `That's ${fmtINR(Math.abs(ed))} ${ed >= 0 ? 'more' : 'less'} than ${c.prevLabel}`
  if (prevRatio !== null) why += `, when expenses were ${Math.round(prevRatio)}% of sales`
  why += '.'
  if (ratio !== null && prevRatio !== null) {
    const diff = ratio - prevRatio
    if (diff >= 5) why += ' Expenses are growing faster than sales, so this is worth keeping an eye on.'
    else if (diff <= -5) why += ' Spending is taking a smaller share of your sales than before.'
    else why += ' That share is fairly steady.'
  }

  const numbers: NumberChip[] = [
    {
      label: 'Expenses',
      value: fmtShort(c.cur.expenses),
      delta: ed === 0 ? 'no change' : `${arrow(ed)} ${fmtShort(Math.abs(ed))}`,
      tone: ed > 0 ? 'warn' : ed < 0 ? 'good' : 'info',
    },
    { label: 'Sales', value: fmtShort(c.cur.sales) },
  ]
  if (high) numbers.push({ label: 'Highest day', value: fmtShort(high.expenses), delta: fmtDay(high.date) })

  return {
    noticed:
      ratio !== null
        ? `Over ${c.label}, expenses took ${Math.round(ratio)}% of your sales.`
        : `Over ${c.label} you spent ${fmtINR(c.cur.expenses)}.`,
    why,
    extra: high?.note ? `On ${fmtDay(high.date)} you spent ${fmtINR(high.expenses)} and noted: “${high.note}”.` : undefined,
    numbers,
    action: { label: 'See day-by-day spending', page: 'history' },
    followUps: ['Bhai, mera profit kyun kam hua?', 'Am I actually making money?'],
  }
}

function makingMoney(ctx: CopilotContext): CopilotAnswer {
  if (!ctx.records.length) return needMore()
  const end = latestDate(ctx.records)
  const recent = inRange(ctx.records, addDays(end, -29), end)
  if (recent.length < 3) return needMore()
  const t = sumRecords(recent)
  const m = margin(t.sales, t.profit)
  const outstanding = totalRemaining(ctx.pending)

  const noticed =
    t.profit > 0
      ? `Yes, on paper. Your estimated profit over ${recent.length} recorded days is ${fmtINR(t.profit)}.`
      : t.profit < 0
        ? `Not over ${recent.length} recorded days: expenses were ${fmtINR(-t.profit)} more than sales.`
        : 'You roughly broke even over your recent records.'

  let why = `Sales were ${fmtINR(t.sales)} and expenses ${fmtINR(t.expenses)}, a ${Math.round(m)}% margin. This is an estimate (sales minus the expenses you recorded) and doesn't include anything you haven't recorded, like your own pay.`
  if (outstanding > 0) why += ` Also, customers still owe you ${fmtINR(outstanding)}.`

  return {
    noticed,
    why,
    numbers: [
      { label: 'Sales', value: fmtShort(t.sales) },
      { label: 'Expenses', value: fmtShort(t.expenses) },
      { label: 'Profit', value: fmtShort(t.profit), tone: t.profit >= 0 ? 'good' : 'warn' },
    ],
    action: outstanding > 0 ? { label: 'Review pending payments', page: 'pending' } : { label: 'Open History', page: 'history' },
    followUps: ['What changed this week?', 'How much money is still pending?'],
  }
}

function pendingAnswer(ctx: CopilotContext): CopilotAnswer {
  const open = openPayments(ctx.pending)
  if (!open.length) {
    return {
      noticed: 'Nobody owes you money right now.',
      why: 'All recorded credit has been paid back.',
      action: { label: 'Open Pending Payments', page: 'pending' },
      followUps: ['Am I actually making money?'],
    }
  }
  const today = todayStr()
  const total = totalRemaining(ctx.pending)
  const byAmount = [...open].sort((a, b) => remainingOf(b) - remainingOf(a))
  const oldest = [...open].sort((a, b) => a.dateGiven.localeCompare(b.dateGiven))[0]
  const age = daysBetween(oldest.dateGiven, today)
  const flow = pendingFlow(ctx.pending, addDays(today, -6), today)

  return {
    noticed: `${fmtINR(total)} is still pending across ${open.length} customer${open.length === 1 ? '' : 's'}.`,
    why: `${byAmount[0].customer} owes the most (${fmtINR(remainingOf(byAmount[0]))}). The oldest is ${oldest.customer}, from ${fmtDay(oldest.dateGiven)} (${age} day${age === 1 ? '' : 's'} ago).`,
    extra: `In the last 7 days you gave ${fmtINR(flow.given)} on credit and received ${fmtINR(flow.received)}.`,
    numbers: byAmount.slice(0, 4).map((p) => ({
      label: p.customer,
      value: fmtINR(remainingOf(p)),
      delta: `paid ${fmtShort(paidOf(p))}`,
    })),
    action: { label: 'Review pending payments', page: 'pending' },
    followUps: ['Am I actually making money?', 'What changed this week?'],
  }
}

function salesAnswer(ctx: CopilotContext): CopilotAnswer {
  const c = buildComparison(ctx, 7)
  if (!c) return needMore()
  const sp = pctChange(c.cur.sales, c.prev.sales)
  const best = bestSalesDay(c.curRecords)
  return {
    noticed: `Your sales over ${c.label} were ${fmtINR(c.cur.sales)}${sp !== null ? ` (${fmtPct(sp)} versus ${c.prevLabel})` : ''}.`,
    why: best ? `Your strongest day in that time was ${fmtWeekday(best.date)}, ${fmtDay(best.date)}, at ${fmtINR(best.sales)}.` : undefined,
    numbers: [
      { label: 'Sales', value: fmtShort(c.cur.sales), delta: sp !== null ? `${arrow(sp)} ${Math.abs(Math.round(sp))}%` : undefined, tone: sp === null ? 'info' : sp >= 0 ? 'good' : 'warn' },
      { label: 'Daily average', value: fmtShort(c.cur.days ? c.cur.sales / c.cur.days : 0) },
    ],
    action: { label: 'Open History', page: 'history' },
    followUps: ['Which day was strongest?', 'Bhai, mera profit kyun kam hua?'],
  }
}

function bestDayAnswer(ctx: CopilotContext): CopilotAnswer {
  if (ctx.records.length < 3) return needMore()
  const end = latestDate(ctx.records)
  const recent = inRange(ctx.records, addDays(end, -29), end)
  const best = bestSalesDay(recent)
  if (!best) return needMore()
  const wd = bestWeekday(ctx.records)
  const profit = best.sales - best.expenses
  return {
    noticed: `${fmtWeekday(best.date)}, ${fmtDay(best.date)} was your strongest sales day recently, at ${fmtINR(best.sales)}.`,
    why: wd
      ? `Across your records, ${wd.weekday} is your strongest day of the week on average (${fmtINR(wd.avg)}, from ${wd.n} days).`
      : undefined,
    numbers: [
      { label: 'Sales that day', value: fmtShort(best.sales) },
      { label: 'Expenses', value: fmtShort(best.expenses) },
      { label: 'Profit', value: fmtShort(profit), tone: profit >= 0 ? 'good' : 'warn' },
    ],
    action: { label: 'Open History', page: 'history' },
    followUps: ['How are my sales doing?', 'What changed this week?'],
  }
}

function attentionAnswer(ctx: CopilotContext): CopilotAnswer {
  const insights = getInsights(ctx.records, ctx.pending)
  const first = insights[0]
  return {
    noticed: first.title,
    why: insights.slice(0, 2).map((i) => i.body).join(' '),
    numbers: first.facts.map((f) => ({ label: f.label, value: f.value })),
    action: { label: "Record today's numbers", page: 'checkup' },
    followUps: [first.question, 'Am I actually making money?'].filter((q, i, a) => a.indexOf(q) === i),
    insufficient: first.id === 'getting-started',
  }
}

function fallback(): CopilotAnswer {
  return {
    noticed: "I can answer questions about your sales, expenses, profit, pending payments and best days.",
    why: "I only use the numbers you've recorded, so I won't guess. Try one of these:",
    followUps: suggestedQuestions.slice(0, 5),
  }
}

export function askCopilot(question: string, ctx: CopilotContext): CopilotAnswer {
  const q = question.toLowerCase()
  const has = (re: RegExp) => re.test(q)

  if (has(/\bpending|\bowe|udhar|baaki|outstanding|receivable/)) return pendingAnswer(ctx)
  if (has(/strong|best day|which day|busiest/)) return bestDayAnswer(ctx)
  if (has(/making money|actually|profitable|munafa ho/)) return makingMoney(ctx)
  if (has(/spend|expense|kharch|worr|cost/)) return expensesAnswer(ctx)
  if (has(/profit|munafa|fayda/)) return profitWhy(ctx, has(/month/) ? 30 : 7)
  if (has(/attention|notice|focus|should i know|important/)) return attentionAnswer(ctx)
  if (has(/difference|compare|chang|badla|last month|last week|week|month/)) {
    return profitWhy(ctx, has(/month/) ? 30 : 7, true)
  }
  if (has(/sales|bikri|revenue|selling/)) return salesAnswer(ctx)
  return fallback()
}
