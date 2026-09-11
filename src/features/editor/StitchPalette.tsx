import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import type { StitchType } from '../../types/pattern'
import { MOVE_CANCEL_PX } from './constants'

const STITCHES: { type: StitchType; labelKey: string }[] = [
  { type: 'chain', labelKey: 'stitch.chain' },
  { type: 'single', labelKey: 'stitch.single' },
  { type: 'double', labelKey: 'stitch.double' },
  { type: 'slipStitch', labelKey: 'stitch.slipStitch' },
]

// Muted, business-appropriate accents — not a full rainbow.
const COLORS: { value: string | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: 'color.default' },
  { value: '#b45309', labelKey: 'color.amber' },
  { value: '#b91c1c', labelKey: 'color.rust' },
  { value: '#166534', labelKey: 'color.sage' },
  { value: '#1d4ed8', labelKey: 'color.slateBlue' },
]

export function StitchPalette() {
  const { t } = useTranslation()
  const {
    activeStitch,
    setActiveStitch,
    activeColor,
    setActiveColor,
    beginPaletteDrag,
    updatePaletteDrag,
    endPaletteDrag,
    cancelPaletteDrag,
    dragPreview,
    selectedStitchIds,
    setSelectedType,
    setSelectedColor,
    deleteSelectedStitches,
  } = usePatternStore()

  const downPos = useRef<{ x: number; y: number } | null>(null)
  const hasSelection = selectedStitchIds.length > 0

  const onStitchPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    type: StitchType,
  ) => {
    setActiveStitch(type)
    downPos.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
    beginPaletteDrag(type, activeColor, e.clientX, e.clientY)
  }

  const onStitchPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragPreview) return
    updatePaletteDrag(e.clientX, e.clientY)
  }

  const onStitchPointerUp = (
    e: React.PointerEvent<HTMLButtonElement>,
    type: StitchType,
  ) => {
    const start = downPos.current
    downPos.current = null
    const moved = start
      ? Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX
      : false

    if (!moved && hasSelection) {
      // A tap (not a drag onto the canvas) while something is selected
      // restyles the selection instead of placing a new stitch.
      setSelectedType(type)
      cancelPaletteDrag()
      return
    }
    endPaletteDrag()
  }

  const onColorClick = (value: string | undefined) => {
    setActiveColor(value)
    if (hasSelection) setSelectedColor(value)
  }

  return (
    <div className="p-2">
      {hasSelection && (
        <div className="mb-2 flex items-center justify-between rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">
          <span>{t('editor.selectedCount', { count: selectedStitchIds.length })}</span>
          <button
            type="button"
            onClick={deleteSelectedStitches}
            className="rounded-md border border-red-200 px-2 py-1 text-red-600"
          >
            {t('editor.delete')}
          </button>
        </div>
      )}
      <div className="flex gap-2 overflow-x-auto">
        {STITCHES.map(({ type, labelKey }) => (
          <button
            key={type}
            onPointerDown={(e) => onStitchPointerDown(e, type)}
            onPointerMove={onStitchPointerMove}
            onPointerUp={(e) => onStitchPointerUp(e, type)}
            onPointerCancel={cancelPaletteDrag}
            className={`shrink-0 touch-none rounded-lg border px-3 py-2 text-sm select-none ${
              activeStitch === type
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 bg-white text-zinc-700'
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 overflow-x-auto">
        {COLORS.map(({ value, labelKey }) => (
          <button
            key={value ?? 'default'}
            onClick={() => onColorClick(value)}
            aria-label={t(labelKey)}
            aria-pressed={activeColor === value}
            className={`h-6 w-6 shrink-0 rounded-full border-2 ${
              activeColor === value ? 'border-zinc-900' : 'border-transparent'
            }`}
            style={{ backgroundColor: value ?? '#18181b' }}
          />
        ))}
      </div>

      {dragPreview && (
        <div
          className="pointer-events-none fixed z-50 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-900 bg-white/90 text-xs font-medium text-zinc-900 shadow-lg"
          style={{ left: dragPreview.clientX, top: dragPreview.clientY }}
        >
          {t(STITCHES.find((s) => s.type === dragPreview.type)?.labelKey ?? '')}
        </div>
      )}
    </div>
  )
}
