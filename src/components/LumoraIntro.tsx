import { useEffect, useRef, useState } from 'react'

type LumoraIntroProps = {
  onComplete: () => void
}

const scenes = [
  {
    type: 'opening',
    label: '',
    title: 'You keep the business running.',
    subtitle: 'But who keeps track of what it means?',
  },
  {
    type: 'logo',
    label: '',
    title: 'LUMORA',
    subtitle: 'Your business has a story.',
  },
  {
    type: 'understanding',
    label: 'SEE WHAT MATTERS',
    title: 'Numbers tell you what happened.',
    subtitle: 'Lumora helps you understand why it matters.',
  },
  {
    type: 'final',
    label: '',
    title: 'Tell us what happened.',
    subtitle: "We'll help you make sense of it.",
  },
]

const sceneDuration = 5500

function LumoraIntro({ onComplete }: LumoraIntroProps) {
  const [currentScene, setCurrentScene] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const musicStartedRef = useRef(false)

  const startMusic = async () => {
    if (musicStartedRef.current || !audioRef.current) {
      return
    }

    try {
      audioRef.current.volume = 0.12
      await audioRef.current.play()
      musicStartedRef.current = true
    } catch {
      // Browser blocked autoplay.
      // Music will start after the first interaction.
    }
  }

  const finish = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }

    onComplete()
  }

  const goToScene = (sceneIndex: number) => {
    if (sceneIndex < 0) {
      setCurrentScene(0)
      return
    }

    if (sceneIndex >= scenes.length) {
      finish()
      return
    }

    setCurrentScene(sceneIndex)
  }

  const nextScene = () => {
    void startMusic()
    goToScene(currentScene + 1)
  }

  const previousScene = () => {
    void startMusic()
    goToScene(currentScene - 1)
  }

  useEffect(() => {
    void startMusic()

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }

      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  useEffect(() => {
    if (currentScene === scenes.length - 1) {
      return
    }

    timerRef.current = setTimeout(() => {
      goToScene(currentScene + 1)
    }, sceneDuration)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [currentScene])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        nextScene()
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        previousScene()
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        finish()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [currentScene])

  const scene = scenes[currentScene]

  return (
    <section
      className={`lumora-intro intro-${scene.type}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          nextScene()
        }
      }}
    >
      <audio
  ref={audioRef}
  src="/lumora-ambient (2).mp3"
  loop
  preload="auto"
/>

      {/* Cinematic atmosphere */}
      <div className="intro-light intro-light-one" />
      <div className="intro-light intro-light-two" />
      <div className="intro-vignette" />
      <div className="intro-grain" />
      <div className="intro-grid" />

      {/* Scene 1: scattered real-world business data */}
      <div className="business-fragments" aria-hidden="true">
        <span className="fragment-one">₹850</span>
        <span className="fragment-two">UPI</span>
        <span className="fragment-three">₹2,400</span>
        <span className="fragment-four">CASH</span>
        <span className="fragment-five">₹5,200</span>
        <span className="fragment-six">CREDIT</span>
        <span className="fragment-seven">₹1,150</span>
        <span className="fragment-eight">EXPENSE</span>
      </div>

      {scene.type === 'opening' && (
  <>
    <div className="opening-trail" aria-hidden="true">
      <span>SALE</span>
      <span>PAYMENT</span>
      <span>EXPENSE</span>
      <span>UPI</span>
    </div>

    <div className="opening-final-line" aria-hidden="true">
      Every day leaves a trail.
    </div>
  </>
)}

      {/* Scene 3: numbers becoming understanding */}
      <div className="intro-number-field" aria-hidden="true">
        <div className="intro-number sales-number">
          <span>SALES</span>
          <strong>₹12,500</strong>
        </div>

        <div className="intro-number expense-number">
          <span>EXPENSES</span>
          <strong>₹8,000</strong>
        </div>

        <div className="intro-number profit-number">
          <span>ESTIMATED PROFIT</span>
          <strong>₹4,500</strong>
        </div>
      </div>

      <div className="intro-micro-line micro-line-one" />
      <div className="intro-micro-line micro-line-two" />
      <div className="intro-micro-line micro-line-three" />

      <div className="intro-insight" aria-hidden="true">
        <span>WHAT CHANGED</span>

        <strong>
          Your expenses were higher than usual.
        </strong>

        <div className="intro-insight-data">
          <div>
            <small>Usual</small>
            <b>₹1,500</b>
          </div>

          <div>
            <small>Today</small>
            <b>₹2,400</b>
          </div>

          <div>
            <small>Difference</small>
            <b>+₹900</b>
          </div>
        </div>
      </div>

      {/* Top control */}
      <div className="intro-top-controls">
        <button
          type="button"
          className="intro-skip"
          onClick={(event) => {
            event.stopPropagation()
            finish()
          }}
        >
          Skip intro
        </button>
      </div>

      {/* Main cinematic copy */}
      <div className="intro-content">
        <div key={currentScene} className="intro-shot">
          {scene.label && (
            <span className="intro-small">{scene.label}</span>
          )}

          <h1>{scene.title}</h1>

          <p>{scene.subtitle}</p>

          {scene.type === 'final' && (
            <button
              type="button"
              className="intro-button"
              onClick={(event) => {
                event.stopPropagation()
                finish()
              }}
            >
              Get Started →
            </button>
          )}
        </div>
      </div>

      {/* Bottom navigation */}
      <div className="intro-bottom">
        <div className="intro-controls">
          <button
            type="button"
            className="intro-control"
            onClick={(event) => {
              event.stopPropagation()
              previousScene()
            }}
            disabled={currentScene === 0}
            aria-label="Previous scene"
          >
            ←
          </button>

          <button
            type="button"
            className="intro-control"
            onClick={(event) => {
              event.stopPropagation()
              nextScene()
            }}
            aria-label="Next scene"
          >
            →
          </button>
        </div>

        <div className="intro-progress" aria-label={`Scene ${currentScene + 1} of ${scenes.length}`}>
          {scenes.map((_, index) => (
            <span
              key={index}
              className={index === currentScene ? 'active' : ''}
            />
          ))}
        </div>

        <span className="intro-instruction">
          Click to continue · ← → to navigate
        </span>
      </div>
    </section>
  )
}

export default LumoraIntro