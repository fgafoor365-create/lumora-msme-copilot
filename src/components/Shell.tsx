import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  ClipboardCheck,
  HandCoins,
  History,
  House,
  PiggyBank,
  ScanLine,
  Sparkles,
} from 'lucide-react'
import type { ChatMessage, Page } from '../types'
import type { ScanImage } from '../types/ledger'
import { useLumoraStore } from '../lib/store'
import { totalRemaining } from '../lib/calc'
import { decodeHtmlEntities, fmtShort } from '../lib/utils'
import { getInsights } from '../lib/insights'
import { askCopilot } from '../lib/copilot'

import { I18nContext, translate, type TranslationKey } from '../lib/i18n'
import LumoraTutorial from './LumoraTutorial'
import LanguageSwitcher, { type LumoraLanguage } from './LanguageSwitcher'
import '../styles/lumora-app.css'
import HomePage from './HomePage'
import CheckupPage from './CheckupPage'
import HistoryPage from './HistoryPage'
import CalendarPage from './CalendarPage'
import CopilotPage from './CopilotPage'
import PendingPage from './PendingPage'
import PiggyPage from './PiggyPage'
import ScanPage from './ScanPage'
const NAV: {
  page: Page
   labelKey: TranslationKey | 'scan'
  shortKey: TranslationKey | 'scan'
  icon: typeof House
}[] = [
  { page: 'home', labelKey: 'home', shortKey: 'home', icon: House },
  { page: 'checkup', labelKey: 'checkup', shortKey: 'checkup', icon: ClipboardCheck },
  { page: 'history', labelKey: 'history', shortKey: 'history', icon: History },
  { page: 'calendar', labelKey: 'calendar', shortKey: 'calendar', icon: CalendarDays },
  { page: 'copilot', labelKey: 'copilot', shortKey: 'copilot', icon: Sparkles },
{ page: 'scan', labelKey: 'scan', shortKey: 'scan', icon: ScanLine },
  { page: 'piggy', labelKey: 'piggy', shortKey: 'piggy', icon: PiggyBank },
]

export default function Shell() {
  const store = useLumoraStore()
  const { business, records, pending, goals } = store

  const [page, setPage] = useState<Page>('home')
  const [scanImage, setScanImage] = useState<ScanImage | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])

  const [showTutorial, setShowTutorial] = useState(() => {
    try {
      return localStorage.getItem('lumora_tutorial_seen') !== 'true'
    } catch {
      return false
    }
  })

  const [language, setLanguage] = useState<LumoraLanguage>(() => {
    try {
      const saved = localStorage.getItem('lumora_language')
      return saved === 'te' || saved === 'hi' || saved === 'ur' ? saved : 'en'
    } catch {
      return 'en'
    }
  })

  const t = (key: TranslationKey, values?: Record<string, string | number>) =>
    translate(language, key, values)

  useEffect(() => {
    try {
      localStorage.setItem('lumora_language', language)
    } catch {
      // Language changes still work for this session.
    }

    document.documentElement.lang = language
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr'
  }, [language])

  const closeTutorial = () => {
    try {
      localStorage.setItem('lumora_tutorial_seen', 'true')
    } catch {
      // Continue even when storage is unavailable.
    }

    setShowTutorial(false)
  }

  const insights = useMemo(
    () => getInsights(records, pending, language),
    [records, pending, language],
  )

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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const businessName = decodeHtmlEntities(business.name)
  const initial = businessName.charAt(0).toUpperCase() || 'L'
  const pendingTotal = totalRemaining(pending)
  const businessTypeKeys: Record<string, TranslationKey> = {
    Retail: 'retail',
    'Restaurant / Food': 'businessRestaurant',
    Salon: 'businessSalon',
    'Freelance / Agency': 'businessFreelance',
    Other: 'businessOther',
  }
  const businessTypeLabel = businessTypeKeys[business.type]
    ? t(businessTypeKeys[business.type])
    : decodeHtmlEntities(business.type)

  const titles: Record<Page, string> = {
    home: t('home'),
    checkup: t('checkup'),
    history: t('history'),
    calendar: t('calendar'),
    copilot: t('copilot'),
    pending: t('pending'),
    piggy: t('piggy'),
scan: t('scan'),  }

  return (
    <I18nContext.Provider value={{ language, t }}>
    <div className="lm-app">
      <aside className="lm-sidebar">
        <div className="lm-brand">
          <div className="lm-logo-mark">L</div>
          <span>Lumora</span>
        </div>

        <nav className="lm-nav" aria-label={t('mainNavigation')}>
          {NAV.map(({ page: navPage, labelKey, icon: Icon }) => (
            <button
              key={navPage}
              type="button"
              className={`lm-nav-item ${page === navPage ? 'active' : ''}`}
              aria-current={page === navPage ? 'page' : undefined}
              onClick={() => navigate(navPage)}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{t(labelKey === 'scan' ? 'scan' : labelKey)}</span>
            </button>
          ))}

          <button
            type="button"
            className={`lm-nav-item secondary ${page === 'pending' ? 'active' : ''}`}
            aria-current={page === 'pending' ? 'page' : undefined}
            onClick={() => navigate('pending')}
          >
            <HandCoins size={18} aria-hidden="true" />
            <span>{t('pending')}</span>
          </button>
        </nav>

        <div className="lm-side-foot">
          <div className="lm-biz">
            <div className="lm-avatar">{initial}</div>
            <div>
              <strong>{businessName}</strong>
              <span>{businessTypeLabel}</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="lm-main">
        <header className="lm-header">
          <div>
            <span className="lm-label">{businessName.toUpperCase()}</span>
            <h1>{titles[page]}</h1>
          </div>

          <button
            type="button"
            className="lm-pill-btn"
            onClick={() => navigate('pending')}
            aria-label={`${t('pending')}, ${fmtShort(pendingTotal)} ${t('stillPending').toLowerCase()}`}
          >
            <HandCoins size={16} aria-hidden="true" />
            <span className="lm-pill-text">{t('pending')}</span>
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

          {page === 'history' && (
            <HistoryPage
              records={records}
              pending={pending}
              onNavigate={navigate}
            />
          )}

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

          {page === 'piggy' && (
            <PiggyPage
              goals={goals}
              onAddGoal={store.addGoal}
              onContribute={store.contribute}
            />
          )}
{page === 'scan' && (
  <ScanPage
              image={scanImage}
              onImageChange={setScanImage}
    records={records}
    pending={pending}
              importedKeys={store.importedScanKeys}
              onSave={store.saveScannedEntries}
    onNavigate={navigate}
  />
)}        </div>
      </section>

      <LanguageSwitcher
        language={language}
        onChange={setLanguage}
      />

      <nav className="lm-bottom-nav" aria-label={t('mainNavigation')}>
        {NAV.map(({ page: navPage, shortKey, icon: Icon }) => (
          <button
            key={navPage}
            type="button"
            className={page === navPage ? 'active' : ''}
            aria-current={page === navPage ? 'page' : undefined}
            onClick={() => navigate(navPage)}
          >
            <Icon size={20} aria-hidden="true" />
           <span>{t(shortKey === 'scan' ? 'scan' : shortKey)}</span>
          </button>
        ))}
      </nav>

      {showTutorial && (
        <LumoraTutorial
          onClose={closeTutorial}
          onNavigate={(nextPage) => setPage(nextPage)}
        />
      )}
    </div>
    </I18nContext.Provider>
  )
}

