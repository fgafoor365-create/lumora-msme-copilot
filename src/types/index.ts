export type Business = {
  name: string
  type: string
  age: string
  helpWith: string[]
  challenge: string
}

export type DailyRecord = {
  date: string // YYYY-MM-DD
  sales: number
  expenses: number
  paymentsReceived: number
  creditGiven: number
  note?: string
}

export type PaymentEntry = { date: string; amount: number }

export type PendingPayment = {
  id: string
  customer: string
  amount: number
  dateGiven: string
  payments: PaymentEntry[]
}

export type Contribution = { date: string; amount: number }

export type SavingsGoal = {
  id: string
  name: string
  target: number
  saved: number
  createdAt: string
  monthlyContribution?: number
  contributions: Contribution[]
}

export type Page = 'home' | 'checkup' | 'history' | 'calendar' | 'copilot' | 'pending' | 'piggy'
export type Tone = 'good' | 'warn' | 'info'

export type Fact = { label: string; value: string; strong?: boolean }

export type Insight = {
  id: string
  tone: Tone
  label: string
  title: string
  body: string
  facts: Fact[]
  note?: string
  question: string
}

export type NumberChip = { label: string; value: string; delta?: string; tone?: Tone }

export type CopilotAnswer = {
  noticed: string
  why?: string
  extra?: string
  numbers?: NumberChip[]
  action?: { label: string; page: Page; detail?: string }
  followUps: string[]
  insufficient?: boolean
}

export type CopilotContext = {
  business: Business
  records: DailyRecord[]
  pending: PendingPayment[]
  goals: SavingsGoal[]
}

export type ChatMessage =
  | { from: 'user'; text: string }
  | { from: 'lumora'; answer: CopilotAnswer }

export type CheckupInput = {
  sales: number
  expenses: number
  paymentsReceived: number
  creditGiven: number
  note?: string
  creditCustomer?: string
  paidPaymentId?: string
}
