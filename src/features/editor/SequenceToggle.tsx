import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'

export function SequenceToggle() {
  const { t } = useTranslation()
  const { showSequence, toggleSequence } = usePatternStore()

  return (
    <button
      type="button"
      onClick={toggleSequence}
      aria-label={t('editor.showSequence')}
      aria-pressed={showSequence}
      title={t('editor.showSequence')}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border select-none ${
        showSequence
          ? 'border-zinc-900 text-zinc-900'
          : 'border-zinc-300 text-zinc-400'
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M2 5c3 0 3 4 6 4s3-4 6-4 3 4 4 4" />
        <path d="M2 15c3 0 3-4 6-4s3 4 6 4 3-4 4-4" strokeOpacity="0.45" />
      </svg>
    </button>
  )
}
