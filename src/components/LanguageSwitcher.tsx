import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()

  return (
    <div className="flex gap-1" role="group" aria-label="Language">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => i18n.changeLanguage(lang.code)}
          aria-label={lang.name}
          aria-pressed={i18n.resolvedLanguage === lang.code}
          title={lang.name}
          className={`flex h-8 w-8 items-center justify-center rounded-md border text-lg leading-none ${
            i18n.resolvedLanguage === lang.code
              ? 'border-zinc-900'
              : 'border-transparent opacity-60'
          }`}
        >
          <span aria-hidden="true">{lang.flag}</span>
        </button>
      ))}
    </div>
  )
}
