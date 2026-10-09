import type { DailyRecord, PendingPayment, SavingsGoal } from '../types'
import { addDays, dayOfWeek } from '../lib/utils'

/** Fictional customers on credit. Dates are relative to `today` so the demo always looks current. */
export function demoPending(today: string): PendingPayment[] {
  const d = (n: number) => addDays(today, -n)
  return [
    { id: 'demo-p1', customer: 'Ravi Traders', amount: 6500, dateGiven: d(21), payments: [{ date: d(9), amount: 2000 }] },
    { id: 'demo-p2', customer: 'Meena Catering', amount: 4200, dateGiven: d(12), payments: [] },
    { id: 'demo-p3', customer: 'Imran', amount: 1800, dateGiven: d(5), payments: [{ date: d(2), amount: 800 }] },
    {
      id: 'demo-p4',
      customer: 'Suresh & Sons',
      amount: 3000,
      dateGiven: d(34),
      payments: [{ date: d(10), amount: 1500 }, { date: d(3), amount: 1500 }],
    },
    { id: 'demo-p5', customer: 'Anita', amount: 2500, dateGiven: d(2), payments: [] },
    { id: 'demo-p6', customer: 'Kiran Stores', amount: 3200, dateGiven: d(1), payments: [] },
  ]
}

/** 60 days of believable daily records. Deterministic (no randomness), but never identical day to day. */
export function demoRecords(today: string, pending: PendingPayment[]): DailyRecord[] {
  const baseSales = [13200, 9000, 9300, 9900, 10300, 11900, 13100] // Sun..Sat
  const out: DailyRecord[] = []

  for (let i = 59; i >= 0; i--) {
    const date = addDays(today, -i)
    const wobbleS = (((i * 7) % 13) - 6) * 210
    const wobbleE = (((i * 5) % 9) - 4) * 170

    let sales = baseSales[dayOfWeek(date)] + wobbleS + (i < 7 ? 700 : 0)
    let expenses = 5800 + wobbleE + (i < 7 ? 1500 : 0)
    let note: string | undefined

    if (i === 0) {
      sales = 12500
      expenses = 9400
      note = 'Restocked packaging and supplies for the weekend'
    }

    const creditGiven = pending.filter((p) => p.dateGiven === date).reduce((s, p) => s + p.amount, 0)
    const paymentsReceived = pending
      .flatMap((p) => p.payments)
      .filter((x) => x.date === date)
      .reduce((s, x) => s + x.amount, 0)

    out.push({ date, sales, expenses, paymentsReceived, creditGiven, ...(note ? { note } : {}) })
  }
  return out
}

export function demoGoals(today: string): SavingsGoal[] {
  const d = (n: number) => addDays(today, -n)
  return [
    {
      id: 'demo-g1',
      name: 'Bike',
      target: 120000,
      saved: 35000,
      createdAt: d(180),
      monthlyContribution: 6000,
      contributions: [
        { date: d(150), amount: 5000 },
        { date: d(120), amount: 6000 },
        { date: d(90), amount: 6000 },
        { date: d(60), amount: 6000 },
        { date: d(30), amount: 6000 },
        { date: d(7), amount: 6000 },
      ],
    },
    {
      id: 'demo-g2',
      name: 'Emergency fund',
      target: 50000,
      saved: 12000,
      createdAt: d(60),
      contributions: [
        { date: d(45), amount: 6000 },
        { date: d(15), amount: 6000 },
      ],
    },
  ]
}
