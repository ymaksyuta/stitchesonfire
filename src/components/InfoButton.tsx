import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const REPO_URL = 'https://github.com/ymaksyuta/stitchesonfire'

export function InfoButton() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  // __COMMIT_DATE__ is a full ISO timestamp (see vite.config.ts) — show
  // just the date part, and fall back gracefully if it's ever missing
  // (e.g. a build run outside a git checkout).
  const commitDate = __COMMIT_DATE__ ? __COMMIT_DATE__.slice(0, 10) : '—'

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('info.title')}
        aria-expanded={open}
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-300"
      >
        <img src="/favicon.svg" alt="" className="h-6 w-6 rounded-[5px]" />
      </button>

      {open && (
        <>
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default touch-none bg-black/30"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('info.title')}
            className="fixed left-1/2 top-1/2 z-50 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-zinc-900">{t('info.title')}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('info.close')}
                className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
                  <path d="M5.3 4.3a1 1 0 0 1 1.4 0L10 7.6l3.3-3.3a1 1 0 1 1 1.4 1.4L11.4 9l3.3 3.3a1 1 0 0 1-1.4 1.4L10 10.4l-3.3 3.3a1 1 0 0 1-1.4-1.4L8.6 9 5.3 5.7a1 1 0 0 1 0-1.4z" />
                </svg>
              </button>
            </div>

            <p className="mt-2 text-sm text-zinc-600">{t('info.brief')}</p>

            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 text-sm text-zinc-800 underline underline-offset-2 hover:text-zinc-950"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4 shrink-0 fill-current">
                <path d="M8 0a8 8 0 0 0-2.53 15.59c.4.07.55-.17.55-.38l-.01-1.49c-2.01.44-2.44-.85-2.44-.85-.33-.84-.81-1.06-.81-1.06-.66-.45.05-.44.05-.44.73.05 1.12.75 1.12.75.65 1.11 1.7.79 2.12.6.07-.47.26-.79.46-.98-1.6-.18-3.29-.8-3.29-3.57 0-.79.28-1.43.75-1.94-.08-.18-.33-.92.07-1.92 0 0 .61-.2 2 .74a6.9 6.9 0 0 1 3.64 0c1.39-.94 2-.74 2-.74.4 1 .15 1.74.07 1.92.47.51.75 1.15.75 1.94 0 2.78-1.69 3.39-3.3 3.57.27.23.5.68.5 1.37l-.01 2.03c0 .21.14.45.55.38A8 8 0 0 0 8 0z" />
              </svg>
              {t('info.github')}
            </a>

            <p className="mt-3 border-t border-zinc-100 pt-3 text-xs text-zinc-400">
              {t('info.version', { hash: __COMMIT_HASH__, date: commitDate })}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
