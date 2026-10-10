import type { DailyRecord, PendingPayment } from '../types'
import type {
  ConfirmedEntry,
  Field,
  LedgerRow,
  RawEntry,
  ScanImage,
  ScanResponse,
  ScannerStatus,
} from '../types/ledger'
import { openPayments, paidOf, remainingOf } from './calc'
import { fmtINR, uid } from './utils'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 20 * 1024 * 1024
const MAX_DIMENSION = 1600
const MAX_BASE64_CHARS = 3_600_000

export class LedgerError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

/** Validates the file, then shrinks it to a JPEG small enough to upload. Runs in the browser. */
export async function prepareImage(file: File): Promise<ScanImage> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new LedgerError('bad_type', 'Please use a JPEG, PNG or WebP photo.')
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new LedgerError('too_big', 'That image is too large. Please use one under 20 MB.')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new LedgerError('bad_image', 'That file could not be opened as an image.')
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new LedgerError('bad_image', 'Your browser could not process that image.')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality)
    const base64 = dataUrl.split(',')[1] ?? ''
    if (base64.length <= MAX_BASE64_CHARS) {
      return { dataUrl, base64, mediaType: 'image/jpeg', name: file.name }
    }
  }
  throw new LedgerError('too_big', 'That image is still too large after shrinking. Try a closer photo of one page.')
}

export async function getScannerStatus(): Promise<ScannerStatus> {
  try {
    const res = await fetch('/api/scan-ledger')
    const type = res.headers.get('content-type') ?? ''
    if (!res.ok || !type.includes('json')) return 'unreachable'
    const data = (await res.json()) as { configured?: boolean }
    return data.configured ? 'ready' : 'not_configured'
  } catch {
    return 'unreachable'
  }
}

export async function scanLedger(image: ScanImage, today: string): Promise<ScanResponse> {
  let res: Response
  try {
    res = await fetch('/api/scan-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: image.base64, mediaType: image.mediaType, today }),
    })
  } catch {
    throw new LedgerError('network', 'Could not reach the scanner. Check your internet connection and try again.')
  }

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // handled below
  }
  const obj = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>

  if (!res.ok) {
    throw new LedgerError(
      typeof obj.code === 'string' ? obj.code : 'provider_error',
      typeof obj.message === 'string' ? obj.message : 'The scanner had a problem. Please try again.',
    )
  }
  return {
    entries: Array.isArray(obj.entries) ? (obj.entries as RawEntry[]) : [],
    notes: Array.isArray(obj.notes) ? (obj.notes as string[]) : [],
  }
}

export function toRows(entries: RawEntry[]): LedgerRow[] {
  return entries.map((e) => ({
    id: uid(),
    date: e.date ?? '',
    name: e.name ?? '',
    amount: e.amount !== null ? String(Math.round(e.amount)) : '',
    type: e.type === 'unclear' ? '' : e.type,
    description: e.description,
    status: e.status,
    paymentId: '',
    conf: e.confidence,
    edited: {},
    rawText: e.rawText,
  }))
}

export function blankRow(today: string): LedgerRow {
  return {
    id: uid(),
    date: today,
    name: '',
    amount: '',
    type: '',
    description: '',
    status: 'unknown',
    paymentId: '',
    conf: { date: 'high', name: 'high', amount: 'high', type: 'high' },
    edited: { date: true, name: true, amount: true, type: true },
    rawText: '',
  }
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()

/** Finds an open customer matching the written name (only when unambiguous). */
export function matchCustomer(name: string, open: PendingPayment[]): string {
  const n = normalize(name)
  if (!n) return ''
  const exact = open.filter((p) => normalize(p.customer) === n)
  if (exact.length === 1) return exact[0].id
  const loose = open.filter((p) => {
    const c = normalize(p.customer)
    return c.includes(n) || n.includes(c)
  })
  return loose.length === 1 ? loose[0].id : ''
}

/** True when the model was unsure, or the field is empty, and the owner hasn't touched it yet. */
export function isUncertain(row: LedgerRow, field: Field): boolean {
  if (row.edited[field]) return false
  const empty = field === 'type' ? !row.type : field === 'name' ? false : !String(row[field]).trim()
  return empty || row.conf[field] !== 'high'
}

export type RowErrors = Partial<Record<Field, string>>

export function validateRow(row: LedgerRow, today: string): RowErrors {
  const errors: RowErrors = {}

  if (!row.date) errors.date = 'Add a date'
  else if (Number.isNaN(Date.parse(row.date))) errors.date = 'This date isn’t valid'
  else if (row.date > today) errors.date = 'This date is in the future'

  const amount = Number(row.amount)
  if (!row.amount || !(amount > 0)) errors.amount = 'Add an amount'
  else if (amount > 10_000_000) errors.amount = 'Please check this amount'

  if (!row.type) errors.type = 'Choose what this entry is'
  else if (row.type === 'credit_given' && !row.name.trim()) errors.name = 'Add the customer’s name'
  else if (row.type === 'payment_received' && !row.paymentId) errors.name = 'Choose who paid'

  return errors
}

/** Repayments across rows may not exceed what each customer owes (including credit in this same batch). */
export function paymentOverflow(rows: LedgerRow[], pending: PendingPayment[]): Record<string, string> {
  const open = openPayments(pending)
  const used = new Map<string, number>()
  const out: Record<string, string> = {}
  for (const r of rows) {
    if (r.type !== 'payment_received' || !r.paymentId) continue
    const payer = open.find((p) => p.id === r.paymentId)
    if (!payer) continue
    const total = (used.get(payer.id) ?? 0) + Number(r.amount || 0)
    used.set(payer.id, total)
    if (total > remainingOf(payer)) {
      out[r.id] = `${payer.customer} only owes ${fmtINR(remainingOf(payer))}`
    }
  }
  return out
}

export const entryKey = (e: { date: string; type: string; amount: number | string; name: string }) =>
  [e.date, e.type, Math.round(Number(e.amount)), normalize(e.name)].join('|')

/** One warning per row that may already be recorded. */
export function findDuplicateWarnings(
  rows: LedgerRow[],
  records: DailyRecord[],
  pending: PendingPayment[],
  importedKeys: string[],
): Record<string, string> {
  const out: Record<string, string> = {}
  const seen = new Set<string>()
  const imported = new Set(importedKeys)

  for (const r of rows) {
    if (!r.type || !r.date || !(Number(r.amount) > 0)) continue
    const key = entryKey(r)
    const amount = Math.round(Number(r.amount))

    if (seen.has(key)) {
      out[r.id] = 'Same as another row in this scan.'
    } else if (imported.has(key)) {
      out[r.id] = 'You already saved a matching entry from an earlier scan.'
    } else if (r.type === 'credit_given') {
      const hit = pending.some(
        (p) => normalize(p.customer) === normalize(r.name) && p.amount === amount && p.dateGiven === r.date,
      )
      if (hit) out[r.id] = 'This credit is already in Pending Payments.'
    } else if (r.type === 'payment_received') {
      const hit = pending.some(
        (p) => p.id === r.paymentId && p.payments.some((x) => x.date === r.date && Math.round(x.amount) === amount),
      )
      if (hit) out[r.id] = 'This payment is already recorded.'
    } else {
      const day = records.find((x) => x.date === r.date)
      if (r.type === 'sale' && day && day.sales > 0) {
        out[r.id] = `That day already has ${fmtINR(day.sales)} of sales recorded. This would be added on top.`
      }
      if (r.type === 'expense' && day && day.expenses > 0) {
        out[r.id] = `That day already has ${fmtINR(day.expenses)} of expenses recorded. This would be added on top.`
      }
    }
    seen.add(key)
  }
  return out
}

/** Soft warnings that don't block saving. */
export function rowWarning(row: LedgerRow): string | null {
  if (row.type === 'sale' && row.status === 'unpaid') {
    return 'The page marks this as unpaid. If the customer hasn’t paid yet, choose “Credit given”.'
  }
  if (row.type === 'credit_given' && row.status === 'paid') {
    return 'The page marks this as paid. If it was paid in full, choose “Sale”.'
  }
  return null
}

export function toConfirmed(rows: LedgerRow[]): ConfirmedEntry[] {
  const out: ConfirmedEntry[] = []
  for (const r of rows) {
    if (!r.type) continue
    out.push({
      date: r.date,
      type: r.type,
      amount: Number(r.amount),
      name: r.name.trim(),
      description: r.description.trim(),
      ...(r.type === 'payment_received' ? { paymentId: r.paymentId } : {}),
    })
  }
  return out
}

export { paidOf }
