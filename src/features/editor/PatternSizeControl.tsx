import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'

export function PatternSizeControl() {
  const { t } = useTranslation()
  const { pattern, resizePattern } = usePatternStore()

  const step = (dim: 'rows' | 'cols', delta: number) => {
    const rows = dim === 'rows' ? pattern.rows + delta : pattern.rows
    const cols = dim === 'cols' ? pattern.cols + delta : pattern.cols
    resizePattern(rows, cols)
  }

  return (
    <div className="flex items-center gap-4 text-sm text-zinc-600">
      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-500">{t('editor.rows')}</span>
        <button
          type="button"
          onClick={() => step('rows', -1)}
          aria-label={t('editor.rows') + ' -'}
          className="h-6 w-6 rounded-md border border-zinc-300 text-zinc-700"
        >
          −
        </button>
        <span className="w-6 text-center">{pattern.rows}</span>
        <button
          type="button"
          onClick={() => step('rows', 1)}
          aria-label={t('editor.rows') + ' +'}
          className="h-6 w-6 rounded-md border border-zinc-300 text-zinc-700"
        >
          +
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-xs text-zinc-500">{t('editor.cols')}</span>
        <button
          type="button"
          onClick={() => step('cols', -1)}
          aria-label={t('editor.cols') + ' -'}
          className="h-6 w-6 rounded-md border border-zinc-300 text-zinc-700"
        >
          −
        </button>
        <span className="w-6 text-center">{pattern.cols}</span>
        <button
          type="button"
          onClick={() => step('cols', 1)}
          aria-label={t('editor.cols') + ' +'}
          className="h-6 w-6 rounded-md border border-zinc-300 text-zinc-700"
        >
          +
        </button>
      </div>
    </div>
  )
}
