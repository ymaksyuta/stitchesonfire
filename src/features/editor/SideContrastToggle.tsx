import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import { useLongPress } from './useLongPress'

/** Tap: turn wrong-side desaturation on/off. Long-press/right-click: a
 * range popup for how strong that desaturation is — same pattern as
 * GuideToggle/SequenceToggle. */
export function SideContrastToggle() {
  const { t } = useTranslation()
  const { showSideContrast, toggleSideContrast, sideContrastAmount, setSideContrastAmount } =
    usePatternStore()
  const [open, setOpen] = useState(false)

  const longPress = useLongPress(
    () => setOpen(true),
    () => toggleSideContrast(),
  )

  return (
    <div className="relative">
      <button
        type="button"
        {...longPress}
        aria-label={t('editor.sideContrast')}
        aria-pressed={showSideContrast}
        title={t('editor.sideContrast')}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border select-none ${
          showSideContrast
            ? 'border-zinc-900 text-zinc-900'
            : 'border-zinc-300 text-zinc-400'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4">
          <circle cx="10" cy="10" r="7" fill="currentColor" fillOpacity="0.9" />
          <path d="M10 3a7 7 0 000 14z" fill="currentColor" fillOpacity="0.35" />
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
            <p className="mb-1 text-xs text-zinc-500 select-none">{t('editor.sideContrastAmount')}</p>
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={sideContrastAmount}
              onChange={(e) => setSideContrastAmount(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </>
      )}
    </div>
  )
}
