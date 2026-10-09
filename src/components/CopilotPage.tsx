import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import type { ChatMessage, CopilotAnswer, Insight, Page } from '../types'
import { suggestedQuestions } from '../lib/copilot'

type Props = {
  messages: ChatMessage[]
  topInsight?: Insight
  onAsk: (question: string) => void
  onNavigate: (page: Page, question?: string) => void
}

function AnswerCard({
  answer,
  onAsk,
  onNavigate,
}: {
  answer: CopilotAnswer
  onAsk: (q: string) => void
  onNavigate: (page: Page) => void
}) {
  const action = answer.action
  return (
    <div className="lm-answer">
      <div className="lm-answer-block">
        <span className="lm-label terra">WHAT I NOTICED</span>
        <p className="lead">{answer.noticed}</p>
      </div>

      {answer.why && (
        <div className="lm-answer-block">
          <span className="lm-label">{answer.insufficient ? 'WHAT HELPS' : 'WHY IT MATTERS'}</span>
          <p>{answer.why}</p>
          {answer.extra && <p className="lm-answer-extra">{answer.extra}</p>}
        </div>
      )}

      {answer.numbers && answer.numbers.length > 0 && (
        <div className="lm-answer-block">
          <span className="lm-label">THE NUMBERS</span>
          <div className="lm-numbers">
            {answer.numbers.map((n) => (
              <div key={n.label} className="lm-num">
                <span>{n.label}</span>
                <strong>{n.value}</strong>
                {n.delta && <em className={n.tone ?? 'info'}>{n.delta}</em>}
              </div>
            ))}
          </div>
        </div>
      )}

      {action && (
        <div className="lm-answer-block">
          <span className="lm-label">WHAT YOU CAN DO</span>
          {action.detail && <p>{action.detail}</p>}
          <button type="button" className="lm-btn primary" onClick={() => onNavigate(action.page)}>
            {action.label} →
          </button>
        </div>
      )}

      {answer.followUps.length > 0 && (
        <div className="lm-chips left" role="group" aria-label="Follow-up questions">
          {answer.followUps.map((q) => (
            <button key={q} type="button" className="lm-chip" onClick={() => onAsk(q)}>
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CopilotPage({ messages, topInsight, onAsk, onNavigate }: Props) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length])

  const submit = () => {
    if (!input.trim()) return
    onAsk(input)
    setInput('')
  }

  return (
    <div className="lm-chat">
      <div className="lm-stack">
        {messages.length === 0 && (
          <>
            <section className="lm-hero compact">
              <div>
                <span className="lm-label terra">COPILOT</span>
                <h2>Ask about your business.</h2>
                <p>Answers come from the numbers you’ve recorded. Lumora won’t guess.</p>
              </div>
            </section>

            {topInsight && topInsight.id !== 'getting-started' && (
              <section className="lm-card lm-noticed">
                <span className="lm-label terra">LUMORA NOTICED</span>
                <h3>{topInsight.title}</h3>
                <button type="button" className="lm-link" onClick={() => onAsk(topInsight.question)}>
                  Explain this →
                </button>
              </section>
            )}

            <section>
              <div className="lm-section-head">
                <span className="lm-label">TRY ASKING</span>
              </div>
              <div className="lm-chips left wrap">
                {suggestedQuestions.map((q) => (
                  <button key={q} type="button" className="lm-chip" onClick={() => onAsk(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </section>
          </>
        )}

        {messages.map((m, i) =>
          m.from === 'user' ? (
            <div key={i} className="lm-msg-user">
              {m.text}
            </div>
          ) : (
            <AnswerCard key={i} answer={m.answer} onAsk={onAsk} onNavigate={onNavigate} />
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        className="lm-composer"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor="copilot-input" className="lm-sr">
          Ask Lumora a question
        </label>
        <input
          id="copilot-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about sales, expenses, profit, pending…"
          autoComplete="off"
        />
        <button type="submit" className="lm-send" aria-label="Send" disabled={!input.trim()}>
          <Send size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
