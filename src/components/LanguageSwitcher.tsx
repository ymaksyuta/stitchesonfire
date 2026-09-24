import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'en', flag: '🇬🇧', name: 'English' },
  { code: 'ru', flag: '🇷🇺', name: 'Русский' },
]

export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const current =
    LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0]

  const select = (code: string) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Language"
        aria-expanded={open}
        className="flex h-9 items-center gap-1 rounded-md border border-zinc-300 px-2 text-lg leading-none"
      >
        <span aria-hidden="true">{current.flag}</span>
        <svg viewBox="0 0 20 20" className="h-3 w-3 fill-zinc-500">
          <path d="M5 7l5 6 5-6z" />
        </svg>
      </button>

      {open && (
        <>
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default touch-none"
          />
          <div
            role="listbox"
            aria-label="Language"
            className="absolute right-0 top-full z-40 mt-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg"
          >
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={lang.code === current.code}
                onClick={() => select(lang.code)}
                title={lang.name}
                className={`flex w-full items-center gap-2 px-3 py-2 text-sm whitespace-nowrap ${
                  lang.code === current.code
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  {lang.flag}
                </span>
                {lang.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
