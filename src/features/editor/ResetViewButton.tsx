import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'

/** Zooms and scrolls to fit the whole pattern (or the guideline grid, if
 * there's nothing on it yet) in view — useful since the canvas itself now
 * grows to fit content instead of staying a fixed size. */
export function ResetViewButton() {
  const { t } = useTranslation()
  const { fitView } = usePatternStore()

  return (
    <button
      type="button"
      data-help-id="palette.resetView"
      onClick={fitView}
      aria-label={t('editor.resetView')}
      title={t('editor.resetView')}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-zinc-700"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V3h4" />
        <path d="M17 7V3h-4" />
        <path d="M3 13v4h4" />
        <path d="M17 13v4h-4" />
      </svg>
    </button>
  )
}
