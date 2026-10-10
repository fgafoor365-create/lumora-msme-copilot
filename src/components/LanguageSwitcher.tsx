
import { useState } from 'react'
import { useI18n } from '../lib/i18n'

export type LumoraLanguage = 'en' | 'te' | 'hi' | 'ur'

type Props = {
  language: LumoraLanguage
  onChange: (language: LumoraLanguage) => void
}

const languages: { code: LumoraLanguage; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ur', label: 'Urdu', native: 'اردو' },
]

export default function LanguageSwitcher({ language, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()

  return (
    <div className="lm-language">
      <button
        type="button"
        className="lm-language-trigger"
        aria-expanded={open}
        aria-label={t(open ? 'closeLanguage' : 'chooseLanguage')}
        onClick={() => setOpen(value => !value)}
      >
        <span aria-hidden="true">文</span>
        <span>{t('language')}</span>
        <span aria-hidden="true">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="lm-language-menu" role="group" aria-label={t('chooseLanguage')}>
          {languages.map(item => (
            <button
              type="button"
              key={item.code}
              className={language === item.code ? 'selected' : ''}
              aria-pressed={language === item.code}
              onClick={() => {
                onChange(item.code)
                setOpen(false)
              }}
            >
              {item.native}
              {language === item.code && <span aria-hidden="true"> ✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

