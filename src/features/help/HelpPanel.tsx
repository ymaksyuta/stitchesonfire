import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHelpStore, highlightHelpElement } from './helpStore'
import { HELP_ELEMENTS, HELP_HOWTOS } from './helpRegistry'

export function HelpPanel() {
  const { t } = useTranslation()
  const panelOpen = useHelpStore((s) => s.panelOpen)
  const closePanel = useHelpStore((s) => s.closePanel)
  const [query, setQuery] = useState('')

  if (!panelOpen) return null

  const q = query.trim().toLowerCase()
  const howtos = HELP_HOWTOS.filter((h) => !q || t(h.titleKey).toLowerCase().includes(q))
  const elements = HELP_ELEMENTS.filter((e) => !q || t(e.i18nKey).toLowerCase().includes(q))

  const goTo = (id: string) => {
    closePanel()
    // Let the panel's own close (and its backdrop) finish unmounting
    // before we scroll/highlight, or the just-closed backdrop can eat it.
    window.setTimeout(() => highlightHelpElement(id), 50)
  }

  return (
    <>
      <button
        aria-hidden="true"
        tabIndex={-1}
        onClick={closePanel}
        className="fixed inset-0 z-40 cursor-default touch-none bg-black/30"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('help.title')}
        className="fixed inset-x-3 top-1/2 z-50 max-h-[80vh] -translate-y-1/2 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4 shadow-xl sm:inset-x-auto sm:left-1/2 sm:w-[28rem] sm:-translate-x-1/2"
      >
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-base font-semibold text-zinc-900">{t('help.title')}</h2>
          <button
            type="button"
            onClick={closePanel}
            aria-label={t('info.close')}
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <path d="M5.3 4.3a1 1 0 0 1 1.4 0L10 7.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 9l3.3 3.3a1 1 0 0 1-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 9 5.3 5.7a1 1 0 0 1 0-1.4z" />
            </svg>
          </button>
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('help.searchPlaceholder')}
          aria-label={t('help.searchPlaceholder')}
          className="mt-3 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:outline-none"
        />

        <p className="mt-4 text-xs font-medium tracking-wide text-zinc-400 uppercase">
          {t('help.howtoSection')}
        </p>
        <div className="mt-1 space-y-3">
          {howtos.map((howto) => (
            <div key={howto.id} className="rounded-md border border-zinc-100 p-2">
              <p className="text-sm font-medium text-zinc-900">{t(howto.titleKey)}</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                {howto.steps.map((step, i) => (
                  <li key={i} className="text-sm text-zinc-600">
                    {step.elementId ? (
                      <button
                        type="button"
                        onClick={() => goTo(step.elementId!)}
                        className="text-left underline decoration-dotted underline-offset-2"
                      >
                        {t(step.textKey)}
                      </button>
                    ) : (
                      t(step.textKey)
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ))}
          {howtos.length === 0 && (
            <p className="text-sm text-zinc-400">{t('help.noResults')}</p>
          )}
        </div>

        <p className="mt-4 text-xs font-medium tracking-wide text-zinc-400 uppercase">
          {t('help.elementsSection')}
        </p>
        <div className="mt-1 divide-y divide-zinc-100">
          {elements.map((el) => (
            <button
              key={el.id}
              type="button"
              onClick={() => goTo(el.id)}
              className="block w-full py-2 text-left text-sm text-zinc-700"
            >
              {t(el.i18nKey)}
            </button>
          ))}
          {elements.length === 0 && (
            <p className="py-2 text-sm text-zinc-400">{t('help.noResults')}</p>
          )}
        </div>
      </div>
    </>
  )
}
