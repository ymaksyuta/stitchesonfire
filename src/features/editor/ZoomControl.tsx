import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'

export function ZoomControl() {
  const { t } = useTranslation()
  const { zoom, setZoom } = usePatternStore()

  return (
    <div className="flex items-center gap-1" data-help-id="palette.zoom">
      <button
        type="button"
        onClick={() => setZoom(zoom - 0.25)}
        aria-label={t('editor.zoomOut')}
        className="h-6 w-6 rounded-md border border-zinc-300 text-zinc-700"
      >
        −
      </button>
      <span className="w-10 text-center text-xs text-zinc-500">
        {Math.round(zoom * 100)}%
      </span>
      <button
        type="button"
        onClick={() => setZoom(zoom + 0.25)}
        aria-label={t('editor.zoomIn')}
        className="h-6 w-6 rounded-md border border-zinc-300 text-zinc-700"
      >
        +
      </button>
    </div>
  )
}
