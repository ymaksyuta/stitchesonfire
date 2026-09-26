import { useTranslation } from 'react-i18next'
import { useHelpStore } from './helpStore'

/** Sits next to the language switcher. Tap to enter/exit inspect mode. */
export function HelpButton() {
  const { t } = useTranslation()
  const inspectMode = useHelpStore((s) => s.inspectMode)
  const toggleInspectMode = useHelpStore((s) => s.toggleInspectMode)

  return (
    <button
      type="button"
      data-help-toggle="true"
      onClick={toggleInspectMode}
      aria-label={t('help.button')}
      aria-pressed={inspectMode}
      title={t('help.button')}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold ${
        inspectMode
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-300 text-zinc-700'
      }`}
    >
      ?
    </button>
  )
}
