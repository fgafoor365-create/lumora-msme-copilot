import {
  type DailyRecord,
  type Insight,
  type PeriodSummary,
  calculateProfit,
  summarizeRecords,
} from "./businessData"

export type PeriodComparison = {
  current: PeriodSummary
  previous: PeriodSummary
  salesChange: number
  expenseChange: number
  profitChange: number
  salesChangePercent: number
  expenseChangePercent: number
  profitChangePercent: number
}

function percentageChange(current: number, previous: number): number {
  if (previous === 0) return current === 0 ? 0 : 100

  return Math.round(((current - previous) / previous) * 100)
}

export function comparePeriods(
  currentRecords: DailyRecord[],
  previousRecords: DailyRecord[],
): PeriodComparison {
  const current = summarizeRecords(currentRecords)
  const previous = summarizeRecords(previousRecords)

  return {
    current,
    previous,
    salesChange: current.sales - previous.sales,
    expenseChange: current.expenses - previous.expenses,
    profitChange: current.profit - previous.profit,
    salesChangePercent: percentageChange(current.sales, previous.sales),
    expenseChangePercent: percentageChange(
      current.expenses,
      previous.expenses,
    ),
    profitChangePercent: percentageChange(current.profit, previous.profit),
  }
}

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`
}

export function explainProfitChange(
  comparison: PeriodComparison,
): string {
  const { current, previous } = comparison

  if (current.profit === previous.profit) {
    return "Your estimated profit stayed about the same compared with the previous period."
  }

  if (current.profit > previous.profit) {
    if (current.sales > previous.sales && current.expenses <= previous.expenses) {
      return `Your estimated profit increased because sales rose while expenses stayed controlled. Profit moved from ${money(previous.profit)} to ${money(current.profit)}.`
    }

    if (current.sales > previous.sales && current.expenses > previous.expenses) {
      return `Your sales increased from ${money(previous.sales)} to ${money(current.sales)}, and the increase was larger than the rise in expenses. That lifted estimated profit to ${money(current.profit)}.`
    }

    return `Your estimated profit increased from ${money(previous.profit)} to ${money(current.profit)}.`
  }

  if (current.sales > previous.sales && current.expenses > previous.expenses) {
    return `Sales increased from ${money(previous.sales)} to ${money(current.sales)}, but expenses increased faster. Estimated profit fell from ${money(previous.profit)} to ${money(current.profit)}.`
  }

  if (current.sales < previous.sales) {
    return `Sales fell from ${money(previous.sales)} to ${money(current.sales)}, which reduced estimated profit to ${money(current.profit)}.`
  }

  return `Estimated profit fell from ${money(previous.profit)} to ${money(current.profit)}.`
}

export function answerCopilotQuestion(
  question: string,
  comparison: PeriodComparison,
): string {
  const normalized = question.toLowerCase()

  if (
    normalized.includes("profit") &&
    (normalized.includes("why") ||
      normalized.includes("down") ||
      normalized.includes("kam") ||
      normalized.includes("decrease"))
  ) {
    return explainProfitChange(comparison)
  }

  if (
    normalized.includes("sales") ||
    normalized.includes("sale") ||
    normalized.includes("selling")
  ) {
    if (comparison.salesChange > 0) {
      return `Your sales increased by ${money(comparison.salesChange)} (${comparison.salesChangePercent}%) compared with the previous period.`
    }

    if (comparison.salesChange < 0) {
      return `Your sales decreased by ${money(Math.abs(comparison.salesChange))} (${Math.abs(comparison.salesChangePercent)}%) compared with the previous period.`
    }

    return "Your sales were about the same as the previous period."
  }

  if (
    normalized.includes("expense") ||
    normalized.includes("spending") ||
    normalized.includes("spend") ||
    normalized.includes("kharcha")
  ) {
    if (comparison.expenseChange > 0) {
      return `Your expenses increased by ${money(comparison.expenseChange)} (${comparison.expenseChangePercent}%) compared with the previous period.`
    }

    if (comparison.expenseChange < 0) {
      return `Your expenses decreased by ${money(Math.abs(comparison.expenseChange))} (${Math.abs(comparison.expenseChangePercent)}%) compared with the previous period.`
    }

    return "Your expenses were about the same as the previous period."
  }

  if (
    normalized.includes("difference") ||
    normalized.includes("changed") ||
    normalized.includes("change")
  ) {
    return `Sales changed by ${comparison.salesChangePercent}%, expenses changed by ${comparison.expenseChangePercent}%, and estimated profit changed by ${comparison.profitChangePercent}%.`
  }

  return "I can't confidently explain that yet. Keep recording your business and I'll have more information to work with."
}

export function getDailyProfit(record: DailyRecord): number {
  return calculateProfit(record.sales, record.expenses)
}

export function getHighestSalesDay(
  records: DailyRecord[],
): DailyRecord | null {
  if (records.length === 0) return null

  return records.reduce((highest, record) =>
    record.sales > highest.sales ? record : highest,
  )
}

export function getHighestExpenseDay(
  records: DailyRecord[],
): DailyRecord | null {
  if (records.length === 0) return null

  return records.reduce((highest, record) =>
    record.expenses > highest.expenses ? record : highest,
  )
}

export function getAverageDailyProfit(records: DailyRecord[]): number {
  if (records.length === 0) return 0

  const totalProfit = records.reduce(
    (total, record) => total + getDailyProfit(record),
    0,
  )

  return Math.round(totalProfit / records.length)
}

export function getInsightsForRecords(
  currentRecords: DailyRecord[],
  previousRecords: DailyRecord[],
): Insight[] {
  const current = summarizeRecords(currentRecords)
  const previous = summarizeRecords(previousRecords)

  return [
    ...createBasicInsights(current, previous),
  ]
}

function createBasicInsights(
  current: PeriodSummary,
  previous: PeriodSummary,
): Insight[] {
  const insights: Insight[] = []

  if (current.sales > previous.sales && current.profit > previous.profit) {
    insights.push({
      title: "Sales are moving up",
      message: "Your sales and estimated profit both improved.",
      evidence: `Sales reached ${money(current.sales)} and estimated profit reached ${money(current.profit)}.`,
      action: "Look at your strongest sales days.",
      severity: "success",
    })
  }

  if (
    current.sales > previous.sales &&
    current.expenses > previous.expenses &&
    current.profit < previous.profit
  ) {
    insights.push({
      title: "Expenses are eating into growth",
      message:
        "You are selling more, but your expenses are rising faster than sales.",
      evidence: `Sales: ${money(current.sales)}. Expenses: ${money(current.expenses)}. Profit: ${money(current.profit)}.`,
      action: "Review the expenses that changed most.",
      severity: "warning",
    })
  }

  if (current.expenses < previous.expenses) {
    insights.push({
      title: "Expenses are lower",
      message: "Your spending is lower than the previous period.",
      evidence: `Expenses are now ${money(current.expenses)}.`,
      action: "See whether this lower spending can be maintained.",
      severity: "success",
    })
  }

  if (insights.length === 0) {
    insights.push({
      title: "Keep recording",
      message:
        "Lumora needs more business activity to identify a stronger pattern.",
      evidence: "Your records are still building a useful history.",
      action: "Record today's activity.",
      severity: "info",
    })
  }

  return insights
}