export type Business = {
  name: string
  type: string
  age: string
  helpWith: string[]
  biggestChallenge: string
}

export type DailyRecord = {
  id: string
  date: string
  sales: number
  expenses: number
  paymentsReceived: number
  creditGiven: number
  note?: string
}

export type PendingPayment = {
  id: string
  customerName: string
  amountOwed: number
  dateGiven: string
  paidSoFar: number
}

export type SavingsGoal = {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  createdAt: string
}

export type LumoraData = {
  business: Business
  dailyRecords: DailyRecord[]
  pendingPayments: PendingPayment[]
  savingsGoals: SavingsGoal[]
}

export type PeriodSummary = {
  sales: number
  expenses: number
  profit: number
  paymentsReceived: number
  creditGiven: number
  margin: number
}

export type Insight = {
  title: string
  message: string
  evidence: string
  action?: string
  severity: "info" | "success" | "warning"
}

export function calculateProfit(sales: number, expenses: number): number {
  return sales - expenses
}

export function calculateMargin(sales: number, expenses: number): number {
  if (sales <= 0) return 0

  return Math.round((calculateProfit(sales, expenses) / sales) * 100)
}

export function summarizeRecords(records: DailyRecord[]): PeriodSummary {
  const sales = records.reduce((total, record) => total + record.sales, 0)
  const expenses = records.reduce(
    (total, record) => total + record.expenses,
    0,
  )
  const paymentsReceived = records.reduce(
    (total, record) => total + record.paymentsReceived,
    0,
  )
  const creditGiven = records.reduce(
    (total, record) => total + record.creditGiven,
    0,
  )

  const profit = calculateProfit(sales, expenses)
  const margin = calculateMargin(sales, expenses)

  return {
    sales,
    expenses,
    profit,
    paymentsReceived,
    creditGiven,
    margin,
  }
}

export function getRemainingPayment(payment: PendingPayment): number {
  return Math.max(payment.amountOwed - payment.paidSoFar, 0)
}

export function getTotalPendingPayments(
  payments: PendingPayment[],
): number {
  return payments.reduce(
    (total, payment) => total + getRemainingPayment(payment),
    0,
  )
}

export function getSavingsRemaining(goal: SavingsGoal): number {
  return Math.max(goal.targetAmount - goal.savedAmount, 0)
}

export function getSavingsProgress(goal: SavingsGoal): number {
  if (goal.targetAmount <= 0) return 0

  return Math.min(
    Math.round((goal.savedAmount / goal.targetAmount) * 100),
    100,
  )
}

export function getRecordsForDate(
  records: DailyRecord[],
  date: string,
): DailyRecord[] {
  return records.filter((record) => record.date === date)
}

export function getRecordsBetweenDates(
  records: DailyRecord[],
  startDate: string,
  endDate: string,
): DailyRecord[] {
  return records.filter(
    (record) => record.date >= startDate && record.date <= endDate,
  )
}

export function generateInsights(
  current: PeriodSummary,
  previous: PeriodSummary,
): Insight[] {
  const insights: Insight[] = []

  if (previous.sales > 0 && current.sales > previous.sales) {
    const salesIncrease = Math.round(
      ((current.sales - previous.sales) / previous.sales) * 100,
    )

    if (current.expenses > previous.expenses) {
      const expenseIncrease = Math.round(
        ((current.expenses - previous.expenses) / previous.expenses) * 100,
      )

      if (expenseIncrease > salesIncrease && current.profit < previous.profit) {
        insights.push({
          title: "Expenses grew faster than sales",
          message:
            "Your sales increased, but your expenses increased even faster.",
          evidence: `Sales grew ${salesIncrease}%, while expenses grew ${expenseIncrease}%.`,
          action: "Check which expense categories increased the most.",
          severity: "warning",
        })
      }
    }
  }

  if (current.sales > previous.sales && current.profit > previous.profit) {
    insights.push({
      title: "Your business is growing",
      message: "Sales and estimated profit both increased compared with the previous period.",
      evidence: `Sales: ₹${current.sales.toLocaleString("en-IN")} and profit: ₹${current.profit.toLocaleString("en-IN")}.`,
      action: "Look at what helped your sales improve.",
      severity: "success",
    })
  }

  if (current.expenses > previous.expenses && current.profit < previous.profit) {
    insights.push({
      title: "Profit is under pressure",
      message: "Your expenses increased while your estimated profit decreased.",
      evidence: `Expenses: ₹${current.expenses.toLocaleString("en-IN")} and profit: ₹${current.profit.toLocaleString("en-IN")}.`,
      action: "Review your largest recent expenses.",
      severity: "warning",
    })
  }

  if (current.sales < previous.sales && current.profit < previous.profit) {
    insights.push({
      title: "Sales have slowed",
      message: "Sales and estimated profit are lower than the previous period.",
      evidence: `Sales changed from ₹${previous.sales.toLocaleString("en-IN")} to ₹${current.sales.toLocaleString("en-IN")}.`,
      action: "Compare your strongest and weakest sales days.",
      severity: "warning",
    })
  }

  if (insights.length === 0) {
    insights.push({
      title: "Keep recording",
      message:
        "Lumora needs more business activity before it can identify a strong pattern.",
      evidence: "More records will give Lumora more information to compare.",
      action: "Record today's business activity.",
      severity: "info",
    })
  }

  return insights
}

export function createDemoData(): LumoraData {
  return {
    business: {
      name: "Aarav Home Store",
      type: "Retail",
      age: "3–5 years",
      helpWith: ["Sales & customers", "Accounting & finances"],
      biggestChallenge: "Understanding my numbers",
    },

    dailyRecords: [
      {
        id: "demo-01",
        date: "2026-09-23",
        sales: 12500,
        expenses: 1500,
        paymentsReceived: 3200,
        creditGiven: 1200,
      },
      {
        id: "demo-02",
        date: "2026-09-24",
        sales: 14200,
        expenses: 2100,
        paymentsReceived: 2800,
        creditGiven: 1500,
      },
      {
        id: "demo-03",
        date: "2026-09-25",
        sales: 11800,
        expenses: 1750,
        paymentsReceived: 3500,
        creditGiven: 900,
      },
      {
        id: "demo-04",
        date: "2026-09-26",
        sales: 15600,
        expenses: 2300,
        paymentsReceived: 4200,
        creditGiven: 1800,
      },
      {
        id: "demo-05",
        date: "2026-09-27",
        sales: 17400,
        expenses: 2600,
        paymentsReceived: 3900,
        creditGiven: 2100,
      },
      {
        id: "demo-06",
        date: "2026-09-28",
        sales: 16100,
        expenses: 2200,
        paymentsReceived: 4100,
        creditGiven: 1300,
      },
      {
        id: "demo-07",
        date: "2026-09-29",
        sales: 18900,
        expenses: 3100,
        paymentsReceived: 4600,
        creditGiven: 2200,
      },
      {
        id: "demo-08",
        date: "2026-09-30",
        sales: 20500,
        expenses: 3900,
        paymentsReceived: 5200,
        creditGiven: 2600,
      },
      {
        id: "demo-09",
        date: "2026-10-01",
        sales: 19800,
        expenses: 4100,
        paymentsReceived: 4700,
        creditGiven: 2400,
      },
      {
        id: "demo-10",
        date: "2026-10-02",
        sales: 21400,
        expenses: 4500,
        paymentsReceived: 5000,
        creditGiven: 2800,
      },
      {
        id: "demo-11",
        date: "2026-10-03",
        sales: 22100,
        expenses: 4700,
        paymentsReceived: 5400,
        creditGiven: 2900,
      },
      {
        id: "demo-12",
        date: "2026-10-04",
        sales: 23800,
        expenses: 5100,
        paymentsReceived: 5800,
        creditGiven: 3200,
      },
      {
        id: "demo-13",
        date: "2026-10-05",
        sales: 24700,
        expenses: 5600,
        paymentsReceived: 6100,
        creditGiven: 3500,
      },
      {
        id: "demo-14",
        date: "2026-10-06",
        sales: 25200,
        expenses: 6200,
        paymentsReceived: 6500,
        creditGiven: 3700,
        note: "Stock purchase was higher than usual.",
      },
    ],

    pendingPayments: [
      {
        id: "pending-01",
        customerName: "Rahul",
        amountOwed: 8500,
        dateGiven: "2026-09-28",
        paidSoFar: 3000,
      },
      {
        id: "pending-02",
        customerName: "Ayesha",
        amountOwed: 6200,
        dateGiven: "2026-10-01",
        paidSoFar: 2000,
      },
      {
        id: "pending-03",
        customerName: "Kiran",
        amountOwed: 4800,
        dateGiven: "2026-10-04",
        paidSoFar: 0,
      },
    ],

    savingsGoals: [
      {
        id: "goal-01",
        name: "Bike",
        targetAmount: 85000,
        savedAmount: 35000,
        createdAt: "2026-06-01",
      },
    ],
  }
}

export const defaultLumoraData = createDemoData()