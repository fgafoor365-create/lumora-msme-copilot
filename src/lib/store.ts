import { useEffect, useState } from 'react'
import type {
  Business,
  CheckupInput,
  DailyRecord,
  PendingPayment,
  SavingsGoal,
} from '../types'
import { demoGoals, demoPending, demoRecords } from '../data/demo'
import { remainingOf } from './calc'
import { todayStr, uid } from './utils'

const KEYS = {
  business: 'lumora_business',
  records: 'lumora_records',
  pending: 'lumora_pending',
  goals: 'lumora_goals',
}

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage can be unavailable or full. The app keeps working in memory.
  }
}

function loadList<T>(key: string, fallback: () => T[]): T[] {
  const v = readJSON(key)
  return Array.isArray(v) ? (v as T[]) : fallback()
}

const DEFAULT_BUSINESS: Business = {
  name: 'Your business',
  type: 'Retail',
  age: '',
  helpWith: [],
  challenge: '',
}

function loadBusiness(): Business {
  const v = readJSON(KEYS.business)
  if (v && typeof v === 'object' && typeof (v as Business).name === 'string') {
    return { ...DEFAULT_BUSINESS, ...(v as Business) }
  }
  return DEFAULT_BUSINESS
}

/** Called by onboarding when it finishes. Keeps the existing onboarding answers. */
export function persistBusiness(answers: Record<string, string | string[]>) {
  const str = (k: string) => {
    const v = answers[k]
    return typeof v === 'string' ? v.trim() : ''
  }
  const helpWith = answers.helpWith
  const business: Business = {
    name: str('businessName') || DEFAULT_BUSINESS.name,
    type: str('businessType') || 'Other',
    age: str('businessAge'),
    helpWith: Array.isArray(helpWith) ? helpWith : [],
    challenge: str('challenge'),
  }
  writeJSON(KEYS.business, business)
}

export function useLumoraStore() {
  const [business] = useState<Business>(loadBusiness)
  const [records, setRecords] = useState<DailyRecord[]>(() =>
    loadList(KEYS.records, () => demoRecords(todayStr(), demoPending(todayStr()))),
  )
  const [pending, setPending] = useState<PendingPayment[]>(() =>
    loadList(KEYS.pending, () => demoPending(todayStr())),
  )
  const [goals, setGoals] = useState<SavingsGoal[]>(() =>
    loadList(KEYS.goals, () => demoGoals(todayStr())),
  )

  useEffect(() => writeJSON(KEYS.records, records), [records])
  useEffect(() => writeJSON(KEYS.pending, pending), [pending])
  useEffect(() => writeJSON(KEYS.goals, goals), [goals])

  const addPending = (customer: string, amount: number, date: string = todayStr()) => {
    const entry: PendingPayment = { id: uid(), customer: customer.trim(), amount, dateGiven: date, payments: [] }
    setPending((prev) => [...prev, entry])
  }

  const recordPayment = (id: string, amount: number) => {
    const date = todayStr()
    setPending((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const pay = Math.min(amount, remainingOf(p))
        return pay > 0 ? { ...p, payments: [...p.payments, { date, amount: pay }] } : p
      }),
    )
  }

  const saveCheckup = (input: CheckupInput) => {
    const date = todayStr()
    setRecords((prev) => {
      const existing = prev.find((r) => r.date === date)
      const rec: DailyRecord = {
        date,
        sales: input.sales,
        expenses: input.expenses,
        paymentsReceived: (existing?.paymentsReceived ?? 0) + input.paymentsReceived,
        creditGiven: (existing?.creditGiven ?? 0) + input.creditGiven,
        ...(input.note ? { note: input.note } : {}),
      }
      return [...prev.filter((r) => r.date !== date), rec]
    })
    if (input.creditGiven > 0 && input.creditCustomer) addPending(input.creditCustomer, input.creditGiven, date)
    if (input.paymentsReceived > 0 && input.paidPaymentId) recordPayment(input.paidPaymentId, input.paymentsReceived)
  }

  const addGoal = (g: { name: string; target: number; saved: number; monthlyContribution?: number }) => {
    const date = todayStr()
    const goal: SavingsGoal = {
      id: uid(),
      name: g.name.trim(),
      target: g.target,
      saved: g.saved,
      createdAt: date,
      ...(g.monthlyContribution ? { monthlyContribution: g.monthlyContribution } : {}),
      contributions: g.saved > 0 ? [{ date, amount: g.saved }] : [],
    }
    setGoals((prev) => [...prev, goal])
  }

  const contribute = (id: string, amount: number) => {
    const date = todayStr()
    setGoals((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, saved: g.saved + amount, contributions: [...g.contributions, { date, amount }] }
          : g,
      ),
    )
  }

  const resetDemo = () => {
    const today = todayStr()
    const p = demoPending(today)
    setPending(p)
    setRecords(demoRecords(today, p))
    setGoals(demoGoals(today))
  }

  return { business, records, pending, goals, saveCheckup, addPending, recordPayment, addGoal, contribute, resetDemo }
}
