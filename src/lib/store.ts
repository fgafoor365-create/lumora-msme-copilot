
import { useEffect, useState } from 'react'
import type {
  Business,
  CheckupInput,
  DailyRecord,
  PendingPayment,
  SavingsGoal,
} from '../types'
import type { ConfirmedEntry } from '../types/ledger'
import { demoGoals, demoPending, demoRecords } from '../data/demo'
import { remainingOf } from './calc'
import { todayStr, uid } from './utils'

type StoredScanEntry = { key: string; entry: ConfirmedEntry }

const KEYS = {
  business: 'lumora_business',
  records: 'lumora_records',
  pending: 'lumora_pending',
  goals: 'lumora_goals',
  importedScanKeys: 'lumora_imported_scan_keys',
  scannedEntries: 'lumora_scanned_entries',
} as const

function readJSON(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Lumora could not save "${key}" to local storage.`, error)
  }
}

function loadList<T>(key: string, fallback: () => T[]): T[] {
  const value = readJSON(key)
  return Array.isArray(value) ? (value as T[]) : fallback()
}

const DEFAULT_BUSINESS: Business = {
  name: 'Your business',
  type: 'Retail',
  age: '',
  helpWith: [],
  challenge: '',
}

function loadBusiness(): Business {
  const value = readJSON(KEYS.business)

  if (
    value &&
    typeof value === 'object' &&
    typeof (value as Business).name === 'string'
  ) {
    return { ...DEFAULT_BUSINESS, ...(value as Business) }
  }

  return DEFAULT_BUSINESS
}

function validAmount(amount: number, allowZero = false): boolean {
  return (
    Number.isFinite(amount) &&
    (allowZero ? amount >= 0 : amount > 0)
  )
}

function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false

  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    date <= todayStr()
}

/** Called by onboarding when it finishes. */
export function persistBusiness(
  answers: Record<string, string | string[]>,
): void {
  const str = (key: string) => {
    const value = answers[key]
    return typeof value === 'string' ? value.trim() : ''
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
  window.dispatchEvent(new Event('lumora-business-updated'))
}

export function useLumoraStore() {
  const [business, setBusiness] = useState<Business>(loadBusiness)

  const [records, setRecords] = useState<DailyRecord[]>(() =>
  loadList(KEYS.records, () => []),
)

const [pending, setPending] = useState<PendingPayment[]>(() =>
  loadList(KEYS.pending, () => []),
)

const [goals, setGoals] = useState<SavingsGoal[]>(() =>
  loadList(KEYS.goals, () => []),
)

  const [importedScanKeys, setImportedScanKeys] = useState<string[]>(() =>
    loadList(KEYS.importedScanKeys, () => []),
  )
  const [scannedEntries, setScannedEntries] = useState<StoredScanEntry[]>(() =>
    loadList(KEYS.scannedEntries, () => []),
  )

  useEffect(() => {
    const refreshBusiness = () => setBusiness(loadBusiness())

    window.addEventListener('lumora-business-updated', refreshBusiness)
    return () => {
      window.removeEventListener('lumora-business-updated', refreshBusiness)
    }
  }, [])

  useEffect(() => writeJSON(KEYS.records, records), [records])
  useEffect(() => writeJSON(KEYS.pending, pending), [pending])
  useEffect(() => writeJSON(KEYS.goals, goals), [goals])
  useEffect(() => writeJSON(KEYS.importedScanKeys, importedScanKeys), [importedScanKeys])
  useEffect(() => writeJSON(KEYS.scannedEntries, scannedEntries), [scannedEntries])

  const addPending = (
    customer: string,
    amount: number,
    date: string = todayStr(),
  ): void => {
    const name = customer.trim()

    if (!name || !validAmount(amount) || !validDate(date)) return

    const entry: PendingPayment = {
      id: uid(),
      customer: name,
      amount,
      dateGiven: date,
      payments: [],
    }

    setPending((previous) => [...previous, entry])
  }

  const recordPayment = (id: string, amount: number): void => {
    if (!id || !validAmount(amount)) return

    const date = todayStr()

    setPending((previous) =>
      previous.map((payment) => {
        if (payment.id !== id) return payment

        const remaining = remainingOf(payment)

        // Never silently turn an overpayment into a smaller payment.
        if (remaining <= 0 || amount > remaining) return payment

        return {
          ...payment,
          payments: [...payment.payments, { date, amount }],
        }
      }),
    )
  }

  const saveCheckup = (input: CheckupInput): void => {
    const date = todayStr()

    if (
      !validAmount(input.sales, true) ||
      !validAmount(input.expenses, true) ||
      !validAmount(input.paymentsReceived, true) ||
      !validAmount(input.creditGiven, true)
    ) {
      console.error('Lumora could not save the check-up: invalid amounts.')
      return
    }

    const creditCustomer = input.creditCustomer?.trim()
    if (input.creditGiven > 0 && !creditCustomer) {
      console.error('Lumora could not save credit without a customer name.')
      return
    }

    let paymentToRecord = 0

    if (input.paymentsReceived > 0) {
      const payer = input.paidPaymentId
        ? pending.find((payment) => payment.id === input.paidPaymentId)
        : undefined

      if (
        !payer ||
        input.paymentsReceived > remainingOf(payer)
      ) {
        console.error('Lumora could not record this repayment: invalid customer or amount.')
        return
      }

      paymentToRecord = input.paymentsReceived
    }

    setRecords((previous) => {
      const existing = previous.find((record) => record.date === date)

      const updated: DailyRecord = {
        date,
        sales: input.sales,
        expenses: input.expenses,
        paymentsReceived:
          (existing?.paymentsReceived ?? 0) + paymentToRecord,
        creditGiven:
          (existing?.creditGiven ?? 0) + input.creditGiven,
        ...(input.note?.trim()
          ? { note: input.note.trim() }
          : {}),
      }

      return [
        ...previous.filter((record) => record.date !== date),
        updated,
      ]
    })

    if (input.creditGiven > 0 && creditCustomer) {
      addPending(creditCustomer, input.creditGiven, date)
    }

    if (paymentToRecord > 0 && input.paidPaymentId) {
      recordPayment(input.paidPaymentId, paymentToRecord)
    }
  }

  const saveScannedEntries = (
    entries: ConfirmedEntry[],
    keys: string[],
  ): { ok: boolean; message?: string } => {
    if (entries.length === 0 || entries.length !== keys.length) {
      return { ok: false, message: 'There are no valid entries to save.' }
    }

    const nextPending = pending.map((item) => ({ ...item, payments: [...item.payments] }))
    for (const entry of entries) {
      if (!validDate(entry.date) || !validAmount(entry.amount)) {
        return { ok: false, message: 'One or more entries are invalid.' }
      }
      if (entry.type === 'credit_given' && !entry.name.trim()) {
        return { ok: false, message: 'A customer name is required for credit.' }
      }
      if (entry.type === 'payment_received') {
        const payer = nextPending.find((item) => item.id === entry.paymentId)
        if (!payer) return { ok: false, message: 'Choose a valid customer for each payment.' }
        if (entry.amount > remainingOf(payer)) {
          return { ok: false, message: `${payer.customer} does not owe enough for this payment.` }
        }
        payer.payments.push({ date: entry.date, amount: entry.amount })
      }
    }

    const nextRecords = [...records]
    for (const entry of entries) {
      const index = nextRecords.findIndex((record) => record.date === entry.date)
      const current: DailyRecord = index >= 0
        ? nextRecords[index]
        : { date: entry.date, sales: 0, expenses: 0, paymentsReceived: 0, creditGiven: 0 }
      const updated: DailyRecord = {
        ...current,
        sales: current.sales + (entry.type === 'sale' ? entry.amount : 0),
        expenses: current.expenses + (entry.type === 'expense' ? entry.amount : 0),
        paymentsReceived: current.paymentsReceived + (entry.type === 'payment_received' ? entry.amount : 0),
        creditGiven: current.creditGiven + (entry.type === 'credit_given' ? entry.amount : 0),
      }
      if (index >= 0) nextRecords[index] = updated
      else nextRecords.push(updated)

      if (entry.type === 'credit_given') {
        nextPending.push({
          id: uid(),
          customer: entry.name.trim(),
          amount: entry.amount,
          dateGiven: entry.date,
          payments: [],
        })
      }
    }

    setRecords(nextRecords)
    setPending(nextPending)
    setImportedScanKeys((previous) => [...new Set([...previous, ...keys])])
    setScannedEntries((previous) => [
      ...previous,
      ...entries.map((entry, index) => ({ entry, key: keys[index] })),
    ])
    return { ok: true }
  }

  const addGoal = (goalInput: {
    name: string
    target: number
    saved: number
    monthlyContribution?: number
  }): void => {
    const name = goalInput.name.trim()

    if (
      !name ||
      !validAmount(goalInput.target) ||
      !validAmount(goalInput.saved, true) ||
      (goalInput.monthlyContribution !== undefined &&
        !validAmount(goalInput.monthlyContribution))
    ) {
      return
    }

    const date = todayStr()

    const goal: SavingsGoal = {
      id: uid(),
      name,
      target: goalInput.target,
      saved: goalInput.saved,
      createdAt: date,
      ...(goalInput.monthlyContribution
        ? { monthlyContribution: goalInput.monthlyContribution }
        : {}),
      contributions:
        goalInput.saved > 0
          ? [{ date, amount: goalInput.saved }]
          : [],
    }

    setGoals((previous) => [...previous, goal])
  }

  const contribute = (id: string, amount: number): void => {
    if (!id || !validAmount(amount)) return

    const date = todayStr()

    setGoals((previous) =>
      previous.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              saved: goal.saved + amount,
              contributions: [
                ...goal.contributions,
                { date, amount },
              ],
            }
          : goal,
      ),
    )
  }

  const resetDemo = (): void => {
    const today = todayStr()
    const demo = demoPending(today)

    setPending(demo)
    setRecords(demoRecords(today, demo))
    setGoals(demoGoals(today))
    setImportedScanKeys([])
    setScannedEntries([])
  }

  return {
    business,
    records,
    pending,
    goals,
    saveCheckup,
    saveScannedEntries,
    importedScanKeys,
    scannedEntries,
    addPending,
    recordPayment,
    addGoal,
    contribute,
    resetDemo,
  }
}
