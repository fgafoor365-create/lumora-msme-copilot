
import Shell from './components/Shell'
import { useEffect, useState } from 'react'
import LumoraIntro from './components/LumoraIntro'
import { persistBusiness } from './lib/store'
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

  useEffect(() => {
    writeStorage('lumora_answers', JSON.stringify(answers))
  }, [answers])

  const currentQuestion = onboardingSteps[onboardingStep]
  const currentAnswer = answers[currentQuestion.key]

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
    if (option !== 'Something else') {
      setCustomChallenge('')
    }

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
    if (
      currentQuestion.key === 'challenge' &&
      currentAnswer === 'Something else'
    ) {
      return Boolean(customChallenge.trim())
    }

    if (Array.isArray(currentAnswer)) {
      return currentAnswer.length > 0
    }

    return typeof currentAnswer === 'string' && Boolean(currentAnswer.trim())
  }

  const nextOnboardingStep = () => {
    if (!hasValidAnswer()) return

    let completedAnswers = answers

    if (
      currentQuestion.key === 'challenge' &&
      currentAnswer === 'Something else'
    ) {
      completedAnswers = {
        ...answers,
        challenge: customChallenge.trim(),
      }

      setAnswers(completedAnswers)
    }

    if (onboardingStep < onboardingSteps.length - 1) {
      setOnboardingStep((previous) => previous + 1)
      return
    }

    try {
      persistBusiness(completedAnswers)
      writeStorage('lumora_onboarding_complete', 'true')
      setShowOnboarding(false)
    } catch (error) {
      console.error('Could not save the business profile:', error)
    }
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
              LET&apos;S GET TO KNOW YOUR BUSINESS
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
                      className={`onboarding-option ${
                        selected ? 'selected' : ''
                      }`}
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

                      <span className="option-check" aria-hidden="true">
                        {selected ? '✓' : isMultiSelect ? '+' : '›'}
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

  return <Shell />
}

export default App