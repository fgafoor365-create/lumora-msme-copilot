
import { ArrowUpRight, HandCoins, PiggyBank, Plus, Sparkles } from 'lucide-react'
import type {
  Business,
  DailyRecord,
  Insight,
  Page,
  PendingPayment,
  SavingsGoal,
} from '../types'
import {
  goalProgress,
  profitOf,
  sortByDate,
  totalRemaining,
} from '../lib/calc'
import { decodeHtmlEntities, fmtDay, fmtINR, fmtShort, margin, todayStr } from '../lib/utils'
import { EmptyState, InsightCard } from './ui'
import { useI18n } from '../lib/i18n'

type Props = {
  business: Business
  records: DailyRecord[]
  pending: PendingPayment[]
  goals: SavingsGoal[]
  insights: Insight[]
  onNavigate: (page: Page, question?: string) => void
  onResetDemo: () => void
}

export default function HomePage({
  business,
  records,
  pending,
  goals,
  insights,
  onNavigate,
  onResetDemo,
}: Props) {
  const { t, language } = useI18n()
  const locale = `${language}-IN`
  const today = todayStr()
  const sorted = sortByDate(records)
  const shown = sorted.find((record) => record.date === today) ?? sorted[sorted.length - 1]
  const isToday = shown?.date === today
  const outstanding = totalRemaining(pending)
  const goal = goals.find((item) => item.saved < item.target) ?? goals[0]
  const topInsights = insights.slice(0, 2)

  const profit = shown ? profitOf(shown) : 0
  const pct = shown ? margin(profit, shown.sales) : 0
  const barMax = shown ? Math.max(shown.sales, shown.expenses, 1) : 1
  const when = isToday ? t('today') : t('dashOnDate', { date: shown ? fmtDay(shown.date, locale) : '' })

  return (
    <div className="lm-stack">
      <section className="lm-hero">
        <div>
          <span className="lm-label terra">{t('todayBusinessPulse')}</span>
          <h2>{t('businessGlance', { name: decodeHtmlEntities(business.name) })}</h2>
          <p>{t('businessIntro')}</p>
        </div>

        <button
          type="button"
          className="lm-btn primary lg"
          onClick={() => onNavigate('checkup')}
        >
          <Plus size={18} aria-hidden="true" />
          {t('recordToday')}
        </button>
      </section>

      {!shown ? (
        <EmptyState
          title={t('startToday')}
          body={t('pulseWillAppear')}
          actionLabel={t('recordTodaysNumbers')}
          onAction={() => onNavigate('checkup')}
        />
      ) : (
        <section className="lm-card lm-pulse" aria-label={t('dashBusinessPulse')}>
          <div className="lm-card-head">
            <div>
              <span className="lm-label">
                {isToday ? t('today') : `${t('today')} · ${fmtDay(shown.date, locale)}`}
              </span>
              <h3>{t('businessPulse')}</h3>
            </div>

            {!isToday && (
              <button
                type="button"
                className="lm-link"
                onClick={() => onNavigate('checkup')}
              >
                {t('recordToday')} →
              </button>
            )}
          </div>

          <div className="lm-pulse-main">
            <div className="lm-profit">
              <span>{t('estimatedProfit')}</span>
              <strong className={profit < 0 ? 'neg' : ''}>{fmtINR(profit)}</strong>
              <small>{t('dashFromSales', { amount: fmtINR(shown.sales) })}</small>
            </div>

            <div className="lm-bars">
              <div className="lm-bar-row">
                <span>{t('sales')}</span>
                <div className="lm-bar-track">
                  <div
                    className="lm-bar sales"
                    style={{ width: `${(shown.sales / barMax) * 100}%` }}
                  />
                </div>
                <strong>{fmtShort(shown.sales)}</strong>
              </div>

              <div className="lm-bar-row">
                <span>{t('expenses')}</span>
                <div className="lm-bar-track">
                  <div
                    className="lm-bar expenses"
                    style={{ width: `${(shown.expenses / barMax) * 100}%` }}
                  />
                </div>
                <strong>{fmtShort(shown.expenses)}</strong>
              </div>
            </div>
          </div>

          <div className="lm-mini-stats">
            <div>
              <span>{t('margin')}</span>
              <strong>{shown.sales > 0 ? `${Math.round(pct)}%` : '—'}</strong>
            </div>
            <div>
              <span>{t('moneyReceived')}</span>
              <strong>{fmtINR(shown.paymentsReceived)}</strong>
            </div>
            <div>
              <span>{t('stillPending')}</span>
              <strong>{fmtINR(outstanding)}</strong>
            </div>
          </div>

          <div className="lm-pulse-foot">
            <span>
              <i className={`lm-dot ${profit > 0 ? 'good' : profit < 0 ? 'bad' : ''}`} />
              {profit > 0
                ? t('todayMadeMoney', { when })
                : profit < 0
                  ? t('expensesHigher', { when })
                  : t('salesExpensesEqual', { when })}
            </span>
          </div>
        </section>
      )}

      {shown && topInsights.length > 0 && (
        <section>
          <div className="lm-section-head">
            <span className="lm-label terra">{t('whatChanged')}</span>
            <h3>
              {topInsights[0]?.tone === 'info'
                ? t('whereThingsStand')
                : topInsights.length > 1
                  ? t('thingsWorthNoticing')
                  : t('oneThingWorthNoticing')}
            </h3>
          </div>

          <div className="lm-stack tight">
            {topInsights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onAsk={(question) => onNavigate('copilot', question)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="lm-actions" aria-label={t('whatCanDo')}>
        <button
          type="button"
          className="lm-action primary"
          onClick={() => onNavigate('checkup')}
        >
          <span className="lm-action-top">
            <Plus size={20} aria-hidden="true" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <span className="lm-label">{t('checkup')}</span>
          <strong>{isToday ? t('updateNumbers') : t('tellWhatHappened')}</strong>
          <small>{t('recordSalesExpensesPayments')}</small>
        </button>

        <button
          type="button"
          className="lm-action"
          onClick={() => onNavigate('copilot', insights[0]?.question)}
        >
          <span className="lm-action-top">
            <Sparkles size={20} aria-hidden="true" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <span className="lm-label">{t('copilot')}</span>
          <strong>{t('understandNumbers')}</strong>
          <small>{t('explorePatterns')}</small>
        </button>

        <button
          type="button"
          className="lm-action"
          onClick={() => onNavigate('pending')}
        >
          <span className="lm-action-top">
            <HandCoins size={20} aria-hidden="true" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <span className="lm-label">{t('pending')}</span>
          <strong>
            {outstanding > 0 ? t('dashCollectAmount', { amount: fmtINR(outstanding) }) : t('reviewDues')}
          </strong>
          <small>{t('seeOwes')}</small>
        </button>

        <button
          type="button"
          className="lm-action"
          onClick={() => onNavigate('piggy')}
        >
          <span className="lm-action-top">
            <PiggyBank size={20} aria-hidden="true" />
            <ArrowUpRight size={18} aria-hidden="true" />
          </span>
          <span className="lm-label">{t('piggy')}</span>
          <strong>{goal ? t('dashGoal', { name: decodeHtmlEntities(goal.name) }) : t('createSavingsGoal')}</strong>
          <small>
            {goal
              ? t('dashGoalProgress', { percent: Math.round(goalProgress(goal)) })
              : t('dashGoalPlan')}
          </small>
        </button>
      </section>

      <section className="lm-home-foot">
        <p>
          <strong>{t('smallRecords')}</strong>
          <br />
          {t('dashKeepRecording')}
        </p>

        <button
          type="button"
          className="lm-link muted"
          onClick={() => {
            if (
              window.confirm(
                t('resetConfirm'),
              )
            ) {
              onResetDemo()
            }
          }}
        >
          {t('resetDemo')}
        </button>
      </section>
    </div>
  )
}

