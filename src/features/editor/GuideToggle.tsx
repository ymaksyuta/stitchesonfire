import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import { useLongPress } from './useLongPress'

export function GuideToggle() {
  const { t } = useTranslation()
  const { showGuides, toggleGuides, guideBrightness, setGuideBrightness } = usePatternStore()
  const [open, setOpen] = useState(false)

  const longPress = useLongPress(
    () => setOpen(true),
    () => toggleGuides(),
  )

  return (
    <div className="relative">
      <button
        type="button"
        data-help-id="palette.guideToggle"
        {...longPress}
        aria-label={t('editor.showGuides')}
        aria-pressed={showGuides}
        title={t('editor.showGuides')}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border select-none ${
          showGuides
            ? 'border-cyan-700 text-cyan-700'
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

      {open && (
        <>
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default touch-none"
          />
          <div className="absolute bottom-full left-1/2 z-40 mb-2 w-36 -translate-x-1/2 rounded-md border border-zinc-200 bg-white p-3 shadow-lg">
            <p className="mb-1 text-xs text-zinc-500 select-none">{t('editor.gridBrightness')}</p>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={guideBrightness}
              onChange={(e) => setGuideBrightness(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  )
}
