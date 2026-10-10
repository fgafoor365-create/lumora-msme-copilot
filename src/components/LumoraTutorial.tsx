
import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HandCoins,
  Lightbulb,
  PiggyBank,
  Plus,
  Sparkles,
  X,
} from 'lucide-react'
import { useI18n } from '../lib/i18n'

type Props = {
  onClose: () => void
  onNavigate?: (page: 'home' | 'checkup' | 'pending' | 'copilot' | 'piggy') => void
}

const steps = [
  {
    eyebrow: 'YOUR STARTING POINT',
    title: 'Welcome to your business pulse',
    description:
      'This is your home base. Once you record sales and expenses, Lumora shows estimated profit and helps you see how your business is doing.',
    action: 'Explore the dashboard',
    page: 'home' as const,
    Icon: Lightbulb,
    color: 'pulse',
  },
  {
    eyebrow: 'STEP 01 · RECORD',
    title: 'Tell Lumora what happened',
    description:
      'Tap Today’s Check-up to enter your sales and expenses. These records help Lumora estimate profit. Use real figures when you are ready.',
    action: 'Open Today’s Check-up',
    page: 'checkup' as const,
    Icon: Plus,
    color: 'record',
  },
  {
    eyebrow: 'STEP 02 · COLLECT',
    title: 'Keep track of money owed',
    description:
      'Open Pending Payments to review customer balances, add amounts owed, and record repayments when money comes in.',
    action: 'Explore Pending Payments',
    page: 'pending' as const,
    Icon: HandCoins,
    color: 'payments',
  },
  {
    eyebrow: 'STEP 03 · UNDERSTAND',
    title: 'Ask Lumora what the numbers mean',
    description:
      'Use Ask Lumora to explore your business patterns. You can also review History for changes over time and use Piggy Bank to track savings goals.',
    action: 'Meet your copilot',
    page: 'copilot' as const,
    Icon: Sparkles,
    color: 'copilot',
  },
  {
    eyebrow: 'YOU’RE READY',
    title: 'Small records. Clearer decisions.',
    description:
      'Start with one day of sales and expenses. Keep customer payments updated, review your numbers, and build a clearer picture over time.',
    action: 'Get started',
    page: 'home' as const,
    Icon: PiggyBank,
    color: 'ready',
  },
]

export default function LumoraTutorial({ onClose, onNavigate }: Props) {
  const { t } = useI18n()
  const [current, setCurrent] = useState(0)
  const step = steps[current]
  const Icon = step.Icon
  const last = current === steps.length - 1


const goToPage = () => {
  onNavigate?.(step.page)
  onClose()
}

  return (
    <div className="lm-tutorial-backdrop">
      <section
        className="lm-tutorial"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lm-tutorial-title"
      >
        <button
          type="button"
          className="lm-tutorial-close"
          onClick={onClose}
          aria-label={t('closeTutorial')}
        >
          <X size={19} />
        </button>

        <div className={`lm-tutorial-icon ${step.color}`}>
          <Icon size={32} aria-hidden="true" />
        </div>

        <p className="lm-tutorial-kicker">
          {step.eyebrow} · {current + 1} OF {steps.length}
        </p>

        <h2 id="lm-tutorial-title">{step.title}</h2>
        <p className="lm-tutorial-description">{step.description}</p>

        <div className="lm-tutorial-dots" aria-label={`Step ${current + 1} of ${steps.length}`}>
          {steps.map((item, index) => (
            <span
              key={item.eyebrow}
              className={index === current ? 'active' : ''}
            />
          ))}
        </div>

        <button
          type="button"
          className="lm-tutorial-explore"
          onClick={goToPage}
        >
          {step.action}
          <ArrowRight size={17} aria-hidden="true" />
        </button>

        <div className="lm-tutorial-actions">
          <button
            type="button"
            className="lm-tutorial-back"
            onClick={() => setCurrent(value => value - 1)}
            disabled={current === 0}
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t('back')}
          </button>

          {!last && (
            <button
              type="button"
              className="lm-tutorial-next"
              onClick={() => setCurrent(value => value + 1)}
            >
              {t('next')} <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}

          {last && (
            <button
              type="button"
              className="lm-tutorial-next"
              onClick={onClose}
            >
              {t('finish')} <CheckCircle2 size={17} aria-hidden="true" />
            </button>
          )}
        </div>

        {!last && (
          <button
            type="button"
            className="lm-tutorial-skip"
            onClick={onClose}
          >
            {t('skip')}
          </button>
        )}
      </section>
    </div>
  )
}
