import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import { useLongPress } from './useLongPress'

export function SequenceToggle() {
  const { t } = useTranslation()
  const { showSequence, toggleSequence, sequenceBrightness, setSequenceBrightness } =
    usePatternStore()
  const [open, setOpen] = useState(false)

  const longPress = useLongPress(
    () => setOpen(true),
    () => toggleSequence(),
  )

  return (
    <div className="relative">
      <button
        type="button"
        data-help-id="palette.sequenceToggle"
        {...longPress}
        aria-label={t('editor.showSequence')}
        aria-pressed={showSequence}
        title={t('editor.showSequence')}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border select-none ${
          showSequence
            ? 'border-amber-700 text-amber-700'
            : 'border-zinc-300 text-zinc-400'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M2 5c3 0 3 4 6 4s3-4 6-4 3 4 4 4" />
          <path d="M2 15c3 0 3-4 6-4s3 4 6 4 3-4 4-4" strokeOpacity="0.45" />
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
            <p className="mb-1 text-xs text-zinc-500 select-none">{t('editor.sequenceBrightness')}</p>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={sequenceBrightness}
              onChange={(e) => setSequenceBrightness(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  )
}
