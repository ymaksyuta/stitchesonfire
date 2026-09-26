import { useTranslation } from 'react-i18next'
import { useHelpStore } from './helpStore'
import { HELP_ELEMENTS } from './helpRegistry'

export function HelpElementPopup() {
  const { t } = useTranslation()
  const activeElementId = useHelpStore((s) => s.activeElementId)
  const closeElementHelp = useHelpStore((s) => s.closeElementHelp)

  if (!activeElementId) return null
  const entry = HELP_ELEMENTS.find((e) => e.id === activeElementId)
  if (!entry) return null

  return (
    <>
      <button
        aria-hidden="true"
        tabIndex={-1}
        data-help-toggle="true"
        onClick={closeElementHelp}
        className="fixed inset-0 z-40 cursor-default touch-none bg-black/20"
      />
      <div
        role="dialog"
        aria-modal="true"
        data-help-toggle="true"
        className="fixed inset-x-3 bottom-3 z-50 rounded-lg border border-zinc-200 bg-white p-4 shadow-xl"
      >
        <p className="text-sm text-zinc-700">{t(entry.i18nKey)}</p>
        <button
          type="button"
          onClick={closeElementHelp}
          className="mt-3 text-sm font-medium text-zinc-900 underline underline-offset-2"
        >
          {t('help.close')}
        </button>
      </div>
    </>
  )
}
