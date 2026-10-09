import type { DailyRecord, PendingPayment, SavingsGoal } from '../types'
import { addDays, daysBetween, dayOfWeek, todayStr } from './utils'

export type Totals = {
  sales: number
  expenses: number
  profit: number
  days: number
}

export const profitOf = (r: { sales: number; expenses: number }) => r.sales - r.expenses

export function sumRecords(rs: DailyRecord[]): Totals {
  let sales = 0
  let expenses = 0
  for (const r of rs) {
    sales += r.sales
    expenses += r.expenses
  }
  return { sales, expenses, profit: sales - expenses, days: rs.length }
}

export const sortByDate = (rs: DailyRecord[]) =>
  [...rs].sort((a, b) => a.date.localeCompare(b.date))

export const inRange = (rs: DailyRecord[], from: string, to: string) =>
  rs.filter((r) => r.date >= from && r.date <= to)

export function latestDate(rs: DailyRecord[]): string {
  return rs.length ? rs.reduce((m, r) => (r.date > m ? r.date : m), rs[0].date) : todayStr()
}

/** Current window of `days` ending at `end`, and the equally long window before it. */
export function periodPair(rs: DailyRecord[], days: number, end: string) {
  const curFrom = addDays(end, -(days - 1))
  const prevTo = addDays(end, -days)
  const prevFrom = addDays(end, -(2 * days - 1))
  return {
    cur: inRange(rs, curFrom, end),
    prev: inRange(rs, prevFrom, prevTo),
    curFrom,
    prevFrom,
    prevTo,
  }
}

export function bestSalesDay(rs: DailyRecord[]): DailyRecord | null {
  return rs.length ? rs.reduce((b, r) => (r.sales > b.sales ? r : b), rs[0]) : null
}

export function highestExpenseDay(rs: DailyRecord[]): DailyRecord | null {
  return rs.length ? rs.reduce((b, r) => (r.expenses > b.expenses ? r : b), rs[0]) : null
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/** Strongest weekday by average sales (needs at least 3 samples). */
export function bestWeekday(rs: DailyRecord[]) {
  const map = new Map<number, { sum: number; n: number }>()
  for (const r of rs) {
    const d = dayOfWeek(r.date)
    const cur = map.get(d) ?? { sum: 0, n: 0 }
    map.set(d, { sum: cur.sum + r.sales, n: cur.n + 1 })
  }
  let best: { weekday: string; avg: number; n: number } | null = null
  for (const [d, v] of map) {
    if (v.n < 3) continue
    const avg = v.sum / v.n
    if (!best || avg > best.avg) best = { weekday: WEEKDAYS[d], avg, n: v.n }
  }
  return best
}

/* ---------- Pending payments ---------- */

export const paidOf = (p: PendingPayment) => p.payments.reduce((s, x) => s + x.amount, 0)
export const remainingOf = (p: PendingPayment) => Math.max(0, p.amount - paidOf(p))
export const openPayments = (ps: PendingPayment[]) => ps.filter((p) => remainingOf(p) > 0)
export const totalRemaining = (ps: PendingPayment[]) =>
  ps.reduce((s, p) => s + remainingOf(p), 0)

/** Credit given and money received inside a date window. */
export function pendingFlow(ps: PendingPayment[], from: string, to: string) {
  let given = 0
  let received = 0
  for (const p of ps) {
    if (p.dateGiven >= from && p.dateGiven <= to) given += p.amount
    for (const x of p.payments) {
      if (x.date >= from && x.date <= to) received += x.amount
    }
  }
  return { given, received, net: given - received }
}

/* ---------- Savings goals ---------- */

export const goalRemaining = (g: SavingsGoal) => Math.max(0, g.target - g.saved)

export const goalProgress = (g: SavingsGoal) =>
  g.target > 0 ? Math.min(100, Math.max(0, (g.saved / g.target) * 100)) : 0

/** Monthly pace: planned contribution, or saved ÷ months elapsed (only once ≥ 14 days old). */
export function goalPace(g: SavingsGoal): number | null {
  if (g.monthlyContribution && g.monthlyContribution > 0) return g.monthlyContribution
  const age = daysBetween(g.createdAt, todayStr())
  if (age >= 14 && g.saved > 0) return g.saved / (age / 30)
  return null
}

export function goalEstimate(g: SavingsGoal): { months: number | null; text: string } {
  if (g.saved >= g.target) return { months: 0, text: 'Goal reached' }
  const pace = goalPace(g)
  if (!pace || pace <= 0) return { months: null, text: 'Appears after a few weeks of saving' }
  const months = Math.ceil(goalRemaining(g) / pace)
  return { months, text: months <= 1 ? 'about a month' : `about ${months} months` }
}

export function savedInLastDays(g: SavingsGoal, days: number): number {
  const from = addDays(todayStr(), -days)
  return g.contributions.filter((c) => c.date >= from).reduce((s, c) => s + c.amount, 0)
}
