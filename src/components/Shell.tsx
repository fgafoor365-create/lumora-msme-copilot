import "../styles/lumora-app.css"
import { useMemo, useState } from 'react'
import { CalendarDays, ClipboardCheck, HandCoins, History, House, PiggyBank, Sparkles } from 'lucide-react'
import type { ChatMessage, Page } from '../types'
import { useLumoraStore } from '../lib/store'
import { getInsights } from '../lib/insights'
import { askCopilot } from '../lib/copilot'
import { totalRemaining } from '../lib/calc'
import { fmtShort } from '../lib/utils'
import HomePage from './HomePage'
import CheckupPage from './CheckupPage'
import HistoryPage from './HistoryPage'
import CalendarPage from './CalendarPage'
import CopilotPage from './CopilotPage'
import PendingPage from './PendingPage'
import PiggyPage from './PiggyPage'


const NAV: { page: Page; label: string; short: string; icon: typeof House }[] = [
  { page: 'home', label: 'Home', short: 'Home', icon: House },
  { page: 'checkup', label: 'Todayâ€™s Check-up', short: 'Check-up', icon: ClipboardCheck },
  { page: 'history', label: 'History', short: 'History', icon: History },
 { page: 'calendar', label: 'Calendar', short: 'Calendar', icon: CalendarDays },
  { page: 'copilot', label: 'Copilot', short: 'Copilot', icon: Sparkles },
  { page: 'piggy', label: 'Piggy Bank', short: 'Piggy', icon: PiggyBank },
]

const TITLES: Record<Page, string> = {
  home: 'Home',
  checkup: 'Todayâ€™s Check-up',
  history: 'History',
 calendar: 'Calendar',
  copilot: 'Copilot',
  pending: 'Pending Payments',
  piggy: 'Piggy Bank',
}

export default function Shell() {
  const store = useLumoraStore()
  const { business, records, pending, goals } = store

  const [page, setPage] = useState<Page>('home')
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const insights = useMemo(() => getInsights(records, pending), [records, pending])
  const ctx = { business, records, pending, goals }

  const ask = (question: string) => {
    const text = question.trim()
    if (!text) return
    setMessages((prev) => [
      ...prev,
      { from: 'user', text },
      { from: 'lumora', answer: askCopilot(text, ctx) },
    ])
  }

  const navigate = (next: Page, question?: string) => {
    if (question) ask(question)
    setPage(next)
    window.scrollTo({ top: 0 })
  }

  const initial = business.name.charAt(0).toUpperCase() || 'L'
  const pendingTotal = totalRemaining(pending)

  return (
    <div className="lm-app">
      <aside className="lm-sidebar">
        <div className="lm-brand">
          <div className="lm-logo-mark">L</div>
          <span>Lumora</span>
        </div>

        <nav className="lm-nav" aria-label="Main">
          {NAV.map(({ page: p, label, icon: Icon }) => (
            <button
              key={p}
              type="button"
              className={`lm-nav-item ${page === p ? 'active' : ''}`}
              aria-current={page === p ? 'page' : undefined}
              onClick={() => navigate(p)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
          <button
            type="button"
            className={`lm-nav-item secondary ${page === 'pending' ? 'active' : ''}`}
            aria-current={page === 'pending' ? 'page' : undefined}
            onClick={() => navigate('pending')}
          >
            <HandCoins size={18} aria-hidden="true" />
            <span>Pending Payments</span>
          </button>
        </nav>

        <div className="lm-side-foot">
          <div className="lm-biz">
            <div className="lm-avatar">{initial}</div>
            <div>
              <strong>{business.name}</strong>
              <span>{business.type}</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="lm-main">
        <header className="lm-header">
          <div>
            <span className="lm-label">{business.name.toUpperCase()}</span>
            <h1>{TITLES[page]}</h1>
          </div>
          <button
            type="button"
            className="lm-pill-btn"
            onClick={() => navigate('pending')}
            aria-label={`Pending payments, ${fmtShort(pendingTotal)} outstanding`}
          >
            <HandCoins size={16} aria-hidden="true" />
            <span className="lm-pill-text">Pending</span>
            <strong>{fmtShort(pendingTotal)}</strong>
          </button>
        </header>

        <div className="lm-content" key={page}>
          {page === 'home' && (
            <HomePage
              business={business}
              records={records}
              pending={pending}
              goals={goals}
              insights={insights}
              onNavigate={navigate}
              onResetDemo={store.resetDemo}
            />
          )}
          {page === 'checkup' && (
            <CheckupPage
              records={records}
              pending={pending}
              insights={insights}
              onSave={store.saveCheckup}
              onNavigate={navigate}
            />
          )}
          {page === 'history' && <HistoryPage records={records} pending={pending} onNavigate={navigate} />}
          {page === 'calendar' && <CalendarPage records={records} />}
          {page === 'copilot' && (
            <CopilotPage
              messages={messages}
              topInsight={insights[0]}
              onAsk={ask}
              onNavigate={navigate}
            />
          )}
          {page === 'pending' && (
            <PendingPage
              pending={pending}
              insights={insights}
              onAdd={store.addPending}
              onPay={store.recordPayment}
              onNavigate={navigate}
            />
          )}
          {page === 'piggy' && <PiggyPage goals={goals} onAddGoal={store.addGoal} onContribute={store.contribute} />}
        </div>
      </section>

      <nav className="lm-bottom-nav" aria-label="Main">
        {NAV.map(({ page: p, short, icon: Icon }) => (
          <button
            key={p}
            type="button"
            className={page === p ? 'active' : ''}
            aria-current={page === p ? 'page' : undefined}
            onClick={() => navigate(p)}
          >
            <Icon size={20} aria-hidden="true" />
            <span>{short}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
