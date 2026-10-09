
import { useEffect, useState } from 'react'
import LumoraIntro from './components/LumoraIntro'
import './App.css'

type AnswerValue = string | string[]
type OnboardingAnswer = Record<string, AnswerValue>

type OnboardingStep = {
  key: string
  question: string
  subtitle: string
  options: string[] | null
  multiSelect?: boolean
}

const onboardingSteps: OnboardingStep[] = [
  {
    key: 'businessName',
    question: 'What is your business called?',
    subtitle: 'This is how Lumora will recognize your business.',
    options: null,
  },
  {
    key: 'businessType',
    question: 'What kind of business do you run?',
    subtitle: 'Choose the one that feels closest.',
    options: [
      'Retail',
      'Restaurant / Food',
      'Salon',
      'Freelance / Agency',
      'Other',
    ],
  },
  {
    key: 'businessAge',
    question: 'How long have you been running it?',
    subtitle: 'There is no right answer.',
    options: [
      'Just starting',
      'Less than 1 year',
      '1–3 years',
      '3–5 years',
      '5+ years',
    ],
  },
  {
    key: 'helpWith',
    question: 'What would you like Lumora to help with?',
    subtitle: 'Choose everything that matters to you.',
    options: [
      'Sales & customers',
      'Accounting & finances',
      'Marketing',
      'Employees',
      'Business planning',
      'Automating tasks',
      'Other',
    ],
    multiSelect: true,
  },
  {
    key: 'challenge',
    question: 'What is your biggest business challenge?',
    subtitle: 'Choose an option or describe your own challenge.',
    options: [
      'Getting customers',
      'Increasing sales',
      'Managing expenses',
      'Pending payments',
      'Managing employees',
      'Understanding my numbers',
      'Something else',
    ],
  },
]

const navItems = [
  { name: 'Home', icon: '⌂' },
  { name: 'Today’s Check-up', icon: '✓' },
  { name: 'History', icon: '◷' },
  { name: 'Copilot', icon: '✦' },
  { name: 'Piggy Bank', icon: '◎' },
]

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // The app can still run if browser storage is unavailable.
  }
}

function readAnswers(): OnboardingAnswer {
  try {
    const saved = readStorage('lumora_answers')
    return saved ? (JSON.parse(saved) as OnboardingAnswer) : {}
  } catch {
    return {}
  }
}

function App() {
  const [showIntro, setShowIntro] = useState(
    () => readStorage('lumora_intro_seen') !== 'true',
  )

  const [showOnboarding, setShowOnboarding] = useState(
    () => readStorage('lumora_onboarding_complete') !== 'true',
  )

  const [onboardingStep, setOnboardingStep] = useState(0)
  const [answers, setAnswers] = useState<OnboardingAnswer>(readAnswers)
  const [customChallenge, setCustomChallenge] = useState('')
  const [activePage, setActivePage] = useState('Home')

  useEffect(() => {
    writeStorage('lumora_answers', JSON.stringify(answers))
  }, [answers])

  const currentQuestion = onboardingSteps[onboardingStep]
  const currentAnswer = answers[currentQuestion.key]

  const businessName =
    typeof answers.businessName === 'string'
      ? answers.businessName.trim()
      : ''

  const businessType =
    typeof answers.businessType === 'string'
      ? answers.businessType
      : ''

  const businessInitial = businessName.charAt(0).toUpperCase() || 'S'

  const handleIntroComplete = () => {
    writeStorage('lumora_intro_seen', 'true')
    setShowIntro(false)
  }

  const handleSingleAnswer = (value: string) => {
    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.key]: value,
    }))
  }

  const handleMultiAnswer = (value: string) => {
    const existing = answers[currentQuestion.key]
    const selected = Array.isArray(existing) ? existing : []

    const updated = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value]

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.key]: updated,
    }))
  }

  const handleChallengeOption = (option: string) => {
    if (option === 'Something else') {
      handleSingleAnswer(option)
      return
    }

    setCustomChallenge('')
    handleSingleAnswer(option)
  }

  const getAnswerText = (): string => {
    const answer = answers[currentQuestion.key]

    if (Array.isArray(answer)) {
      return answer.join(', ')
    }

    return answer ?? ''
  }

  const hasValidAnswer = (): boolean => {
    if (currentQuestion.key === 'challenge' &&
        currentAnswer === 'Something else') {
      return Boolean(customChallenge.trim())
    }

    if (Array.isArray(currentAnswer)) {
      return currentAnswer.length > 0
    }

    return Boolean(
      typeof currentAnswer === 'string' && currentAnswer.trim(),
    )
  }

  const nextOnboardingStep = () => {
    if (!hasValidAnswer()) return

    if (currentQuestion.key === 'challenge' &&
        currentAnswer === 'Something else') {
      setAnswers((previous) => ({
        ...previous,
        challenge: customChallenge.trim(),
      }))
    }

    if (onboardingStep < onboardingSteps.length - 1) {
      setOnboardingStep((previous) => previous + 1)
      return
    }

    writeStorage('lumora_onboarding_complete', 'true')
    setShowOnboarding(false)
  }

  const previousOnboardingStep = () => {
    if (onboardingStep > 0) {
      setOnboardingStep((previous) => previous - 1)
    }
  }

  if (showIntro) {
    return <LumoraIntro onComplete={handleIntroComplete} />
  }

  if (showOnboarding) {
    const isMultiSelect = currentQuestion.multiSelect === true
    const isChallengeStep = currentQuestion.key === 'challenge'
    const isCustomChallenge = currentAnswer === 'Something else'

    return (
      <main className="lumora-onboarding">
        <div className="onboarding-top">
          <div className="lumora-logo">
            <div className="logo-mark">L</div>
            <span>Lumora</span>
          </div>

          <span className="onboarding-count">
            {onboardingStep + 1} / {onboardingSteps.length}
          </span>
        </div>

        <div className="onboarding-progress">
          <div
            className="onboarding-progress-fill"
            style={{
              width: `${((onboardingStep + 1) / onboardingSteps.length) * 100}%`,
            }}
          />
        </div>

        <section className="onboarding-content">
          <div className="onboarding-question">
            <span className="onboarding-eyebrow">
              LET'S GET TO KNOW YOUR BUSINESS
            </span>
            <h1>{currentQuestion.question}</h1>
            <p>{currentQuestion.subtitle}</p>
          </div>

          {currentQuestion.key === 'businessName' ? (
            <input
              className="onboarding-input"
              type="text"
              value={getAnswerText()}
              onChange={(event) => handleSingleAnswer(event.target.value)}
              placeholder="e.g. Sunrise Store"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') nextOnboardingStep()
              }}
            />
          ) : (
            <>
              <div
                className={`onboarding-options ${
                  isMultiSelect ? 'multi-select' : ''
                }`}
              >
                {currentQuestion.options?.map((option) => {
                  const selected = isMultiSelect
                    ? Array.isArray(currentAnswer) &&
                      currentAnswer.includes(option)
                    : currentAnswer === option

                  return (
                    <button
                      key={option}
                      type="button"
                      className={`onboarding-option ${selected ? 'selected' : ''}`}
                      onClick={() => {
                        if (isMultiSelect) {
                          handleMultiAnswer(option)
                        } else if (isChallengeStep) {
                          handleChallengeOption(option)
                        } else {
                          handleSingleAnswer(option)
                        }
                      }}
                    >
                      <span>{option}</span>
                      <span className="option-check">
                        {selected ? '✓' : isMultiSelect ? '+' : '→'}
                      </span>
                    </button>
                  )
                })}
              </div>

              {isMultiSelect && (
                <p className="onboarding-selection-hint">
                  {Array.isArray(currentAnswer) && currentAnswer.length > 0
                    ? `${currentAnswer.length} selected`
                    : 'You can choose more than one'}
                </p>
              )}

              {isChallengeStep && isCustomChallenge && (
                <input
                  className="onboarding-input onboarding-custom-input"
                  type="text"
                  value={customChallenge}
                  onChange={(event) => setCustomChallenge(event.target.value)}
                  placeholder="Describe your biggest challenge..."
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') nextOnboardingStep()
                  }}
                />
              )}
            </>
          )}

          <div className="onboarding-actions">
            <button
              type="button"
              className="onboarding-back"
              onClick={previousOnboardingStep}
              disabled={onboardingStep === 0}
            >
              ← Back
            </button>

            <button
              type="button"
              className="lumora-button onboarding-next"
              onClick={nextOnboardingStep}
              disabled={!hasValidAnswer()}
            >
              {onboardingStep === onboardingSteps.length - 1
                ? 'Finish →'
                : 'Continue →'}
            </button>
          </div>
        </section>

        <div className="onboarding-footer">
          Your answers help Lumora understand your business.
        </div>
      </main>
    )
  }

  return (
    <main className="lumora-shell">
      <aside className="lumora-sidebar">
        <div className="lumora-logo">
          <div className="logo-mark">L</div>
          <span>Lumora</span>
        </div>

        <nav className="lumora-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button
              key={item.name}
              type="button"
              className={`nav-item ${activePage === item.name ? 'active' : ''}`}
              onClick={() => setActivePage(item.name)}
              aria-current={activePage === item.name ? 'page' : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="business-mini">
            <div className="business-avatar">{businessInitial}</div>
            <div>
              <strong>{businessName || 'Your Business'}</strong>
              <span>{businessType || 'Business owner'}</span>
            </div>
          </div>
        </div>
      </aside>

      <section className="lumora-main">
        <header className="lumora-header">
          <div>
            <span className="header-label">YOUR BUSINESS</span>
            <h1>{activePage}</h1>
          </div>

          <button
            type="button"
            className="profile-button"
            aria-label="Business profile"
            title={businessName || 'Your business'}
          >
            {businessInitial}
          </button>
        </header>

        <div className="lumora-content">
          {activePage === 'Home' ? (
            <HomePage
              businessName={businessName}
              onNavigate={setActivePage}
            />
          ) : (
            <section className="placeholder-page">
              <div>
                <div className="placeholder-icon">✦</div>
                <h2>{activePage}</h2>
                <p>
                  This section is being built. Your business tools will appear here.
                </p>
                <button
                  type="button"
                  className="lumora-button"
                  onClick={() => setActivePage('Home')}
                >
                  Back to Home
                </button>
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  )
}

type HomePageProps = {
  businessName: string
  onNavigate: (page: string) => void
}

function HomePage({ businessName, onNavigate }: HomePageProps) {
  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="home-eyebrow">TODAY · BUSINESS PULSE</span>
          <h2>
            {businessName
              ? `${businessName} at a glance.`
              : 'Your business at a glance.'}
          </h2>
          <p>
            Here’s what happened today — and what might be worth your attention.
          </p>
        </div>

        <button
          type="button"
          className="hero-checkup-button"
          onClick={() => onNavigate('Today’s Check-up')}
        >
          <span>Record today</span>
          <strong>＋</strong>
        </button>
      </section>

      <section className="pulse-card">
        <div className="pulse-header">
          <div>
            <span className="card-label">DEMO DATA</span>
            <h3>Your business pulse</h3>
          </div>
          <span className="pulse-date">Sample day</span>
        </div>

        <div className="pulse-main">
          <div className="profit-display">
            <span>Estimated profit</span>
            <strong>₹4,500</strong>
            <small>from ₹12,500 sales</small>
          </div>

          <div className="pulse-bars">
            <div className="pulse-bar-row">
              <span>Sales</span>
              <div className="pulse-bar-track">
                <div className="pulse-bar sales" style={{ width: '100%' }} />
              </div>
              <strong>₹12.5k</strong>
            </div>

            <div className="pulse-bar-row">
              <span>Expenses</span>
              <div className="pulse-bar-track">
                <div className="pulse-bar expenses" style={{ width: '64%' }} />
              </div>
              <strong>₹8k</strong>
            </div>
          </div>
        </div>

        <div className="pulse-footer">
          <span>
            <i className="status-dot" />
            Sample figures for preview
          </span>
          <span>36% margin</span>
        </div>
      </section>

      <section className="home-section-heading">
        <div>
          <span className="home-eyebrow">WHAT CHANGED</span>
          <h3>One thing worth noticing</h3>
        </div>
      </section>

      <section className="attention-card">
        <div className="attention-mark">!</div>
        <div className="attention-content">
          <div className="attention-meta">
            <span>EXPENSES</span>
            <span>Example insight</span>
          </div>

          <h3>Your expenses were higher than usual.</h3>
          <p>
            In this example, you spent <strong>₹2,400</strong> compared with a
            recent daily average of <strong>₹1,500</strong>.
          </p>

          <div className="comparison-row">
            <div>
              <span>Usual</span>
              <strong>₹1,500</strong>
            </div>
            <div className="comparison-arrow">→</div>
            <div>
              <span>Today</span>
              <strong>₹2,400</strong>
            </div>
            <div className="difference">+₹900</div>
          </div>

          <button
            type="button"
            className="text-action"
            onClick={() => onNavigate('Copilot')}
          >
            Understand this with Lumora →
          </button>
        </div>
      </section>

      <section className="home-actions-grid">
        <button
          type="button"
          className="action-card primary-action-card"
          onClick={() => onNavigate('Today’s Check-up')}
        >
          <div className="action-card-top">
            <span className="action-icon">＋</span>
            <span className="action-arrow">↗</span>
          </div>
          <div>
            <span className="card-label">TODAY'S CHECK-UP</span>
            <h3>Tell Lumora what happened.</h3>
            <p>Record your numbers in less than a minute.</p>
          </div>
        </button>

        <button
          type="button"
          className="action-card copilot-action-card"
          onClick={() => onNavigate('Copilot')}
        >
          <div className="action-card-top">
            <span className="action-icon">✦</span>
            <span className="action-arrow">↗</span>
          </div>
          <div>
            <span className="card-label">ASK LUMORA</span>
            <h3>Why did my profit change?</h3>
            <p>Explore what your numbers are telling you.</p>
          </div>
        </button>
      </section>

      <section className="savings-section">
        <div className="savings-heading">
          <div>
            <span className="home-eyebrow">KEEPING AN EYE ON</span>
            <h3>A goal outside the business</h3>
          </div>
          <button
            type="button"
            className="text-action"
            onClick={() => onNavigate('Piggy Bank')}
          >
            Open Piggy Bank →
          </button>
        </div>

        <button
          type="button"
          className="savings-card"
          onClick={() => onNavigate('Piggy Bank')}
        >
          <div className="savings-visual">
            <div className="savings-orbit">
              <span>29%</span>
            </div>
          </div>

          <div className="savings-details">
            <div className="savings-title-row">
              <div>
                <span className="card-label">DEMO SAVINGS GOAL</span>
                <h3>₹35,000 saved</h3>
              </div>
              <strong>29%</strong>
            </div>

            <div className="savings-track">
              <div className="savings-fill" style={{ width: '29%' }} />
            </div>

            <div className="savings-bottom">
              <span>₹85,000 remaining</span>
              <span>Illustrative target</span>
            </div>
          </div>
        </button>
      </section>

      <section className="home-footer-message">
        <span className="footer-spark">✦</span>
        <p>
          <strong>Small records become useful patterns.</strong>
          <br />
          Keep telling Lumora what happened.
        </p>
      </section>
    </div>
  )
}

export default App