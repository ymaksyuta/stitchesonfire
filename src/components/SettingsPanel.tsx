import { useTranslation } from 'react-i18next'
import type { ReactElement } from 'react'
import { useSettingsStore, type Theme } from '../store/settingsStore'

const THEME_OPTIONS: { value: Theme; labelKey: string; icon: ReactElement }[] = [
  {
    value: 'light',
    labelKey: 'settings.themeLight',
    icon: (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
        <circle cx="10" cy="10" r="4" />
        <g strokeWidth="1.6" stroke="currentColor" strokeLinecap="round">
          <path d="M10 1.5v2.2M10 16.3v2.2M18.5 10h-2.2M3.7 10H1.5" />
          <path d="M15.6 4.4l-1.6 1.6M6 12.4l-1.6 1.6M15.6 15.6L14 14M6 6L4.4 4.4" />
        </g>
      </svg>
    ),
  },
  {
    value: 'dark',
    labelKey: 'settings.themeDark',
    icon: (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
        <path d="M15.8 12.4A6.7 6.7 0 0 1 7.6 4.2a.6.6 0 0 0-.8-.7 7.9 7.9 0 1 0 9.7 9.7.6.6 0 0 0-.7-.8z" />
      </svg>
    ),
  },
  {
    value: 'system',
    labelKey: 'settings.themeSystem',
    icon: (
      <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="3.5" width="16" height="10.5" rx="1.4" strokeLinejoin="round" />
        <path d="M7 17h6M10 14v3" strokeLinecap="round" />
      </svg>
    ),
  },
]

export function SettingsPanel() {
  const { t } = useTranslation()
  const open = useSettingsStore((s) => s.settingsOpen)
  const close = useSettingsStore((s) => s.closeSettings)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  if (!open) return null

  return (
    <>
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={close}
        className="fixed inset-0 z-40 cursor-default touch-none bg-black/30"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('settings.title')}
        className="fixed inset-x-3 top-1/2 z-50 max-h-[80vh] -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-[24rem] sm:-translate-x-1/2 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{t('settings.title')}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={t('info.close')}
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:text-zinc-500 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M5.3 4.3a1 1 0 0 1 1.4 0L10 7.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 9l3.3 3.3a1 1 0 0 1-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 9 5.3 5.7a1 1 0 0 1 0-1.4z" />
            </svg>
          </button>
        </div>

        <div data-help-id="settings.themeSwitcher" className="mt-4">
          <p className="text-xs font-medium tracking-wide text-zinc-400 uppercase dark:text-zinc-500">
            {t('settings.theme')}
          </p>
          {/*
            Selection is shown with a filled background, not a colored
            border — every option keeps the same neutral, theme-defined
            border (border-zinc-300/dark:border-zinc-600) whether picked
            or not, so the control itself never introduces its own
            accent color into the UI.
          */}
          <div className="mt-2 grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const selected = theme === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  aria-pressed={selected}
                  className={`flex flex-col items-center gap-1.5 rounded-md border border-zinc-300 py-2.5 text-xs font-medium dark:border-zinc-600 ${
                    selected
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
                  }`}
                >
                  {opt.icon}
                  {t(opt.labelKey)}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
