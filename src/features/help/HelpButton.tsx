import { useTranslation } from 'react-i18next'
import { useHelpStore } from './helpStore'

/**
 * Sits to the left of the language switcher. Tap to enter/exit inspect
 * mode. `relative z-[100]`: the header itself has no stacking context,
 * so any popup's full-viewport `fixed z-30/z-40` close-on-outside-click
 * backdrop would otherwise paint above this plain in-flow button and
 * swallow the tap before it ever reaches it — z-[100] keeps this button
 * (and only this button) clickable no matter what else is open. Keep
 * this above the highest z-index used by any popup in the app.
 */
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
      className={`relative z-[100] flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-sm font-semibold ${
        inspectMode
          ? 'border-zinc-900 bg-zinc-900 text-white'
          : 'border-zinc-300 text-zinc-700'
      }`}
    >
      ?
    </button>
  )
}
