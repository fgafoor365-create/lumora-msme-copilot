export type LedgerType = 'sale' | 'expense' | 'payment_received' | 'credit_given'
export type Confidence = 'high' | 'medium' | 'low'
export type Field = 'date' | 'name' | 'amount' | 'type'

export type ScanImage = {
  dataUrl: string
  base64: string
  mediaType: 'image/jpeg'
  name: string
}

/** One entry exactly as returned by the recognition endpoint (unverified). */
export type RawEntry = {
  date: string | null
  name: string | null
  amount: number | null
  type: LedgerType | 'unclear'
  description: string
  status: 'paid' | 'unpaid' | 'unknown'
  confidence: Record<Field, Confidence>
  rawText: string
}

export type ScanResponse = {
  entries: RawEntry[]
  notes: string[]
}

/** One editable row in the review screen. */
export type LedgerRow = {
  id: string
  date: string // YYYY-MM-DD or ''
  name: string
  amount: string // digits only while editing
  type: LedgerType | ''
  description: string
  status: 'paid' | 'unpaid' | 'unknown'
  paymentId: string // which open customer a repayment belongs to
  conf: Record<Field, Confidence>
  edited: Partial<Record<Field, boolean>>
  rawText: string
}

/** A row the user has reviewed and confirmed. This is what gets saved. */
export type ConfirmedEntry = {
  date: string
  type: LedgerType
  amount: number
  name: string
  description: string
  paymentId?: string
}

export type ScannerStatus = 'checking' | 'ready' | 'not_configured' | 'unreachable'
