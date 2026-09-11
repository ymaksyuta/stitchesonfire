import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'

export function GuideToggle() {
  const { t } = useTranslation()
  const { showGuides, toggleGuides } = usePatternStore()

  return (
    <button
      type="button"
      onClick={toggleGuides}
      aria-label={t('editor.showGuides')}
      aria-pressed={showGuides}
      title={t('editor.showGuides')}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
        showGuides
          ? 'border-zinc-900 text-zinc-900'
          : 'border-zinc-300 text-zinc-400'
      }`}
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
        <circle cx="4" cy="4" r="1.4" />
        <circle cx="10" cy="4" r="1.4" />
        <circle cx="16" cy="4" r="1.4" />
        <circle cx="4" cy="10" r="1.4" />
        <circle cx="10" cy="10" r="1.4" />
        <circle cx="16" cy="10" r="1.4" />
        <circle cx="4" cy="16" r="1.4" />
        <circle cx="10" cy="16" r="1.4" />
        <circle cx="16" cy="16" r="1.4" />
      </svg>
    </button>
  )
}
