import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import type { StitchType } from '../../types/pattern'
import { GuideToggle } from './GuideToggle'
import { ZoomControl } from './ZoomControl'
import { StitchIcon } from './StitchIcon'
import { ToolPalette } from './ToolPalette'

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
  } = usePatternStore()

  const [colorOpen, setColorOpen] = useState(false)
  const currentColor = COLORS.find((c) => c.value === activeColor) ?? COLORS[0]

  const onStitchPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    type: StitchType,
  ) => {
    setActiveStitch(type)
    e.currentTarget.setPointerCapture(e.pointerId)
    beginPaletteDrag(type, activeColor, e.clientX, e.clientY)
  }

  const onStitchPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragPreview) return
    updatePaletteDrag(e.clientX, e.clientY)
  }

  const onStitchPointerUp = () => {
    // A plain tap (no real drag onto the canvas) just sets the active
    // type/color for next time — endPaletteDrag no-ops if the drop
    // landed outside the canvas, which a tap on the palette itself does.
    endPaletteDrag()
  }

  const onColorClick = (value: string | undefined) => {
    setActiveColor(value)
    setColorOpen(false)
  }

  return (
    <div className="p-2">
      {selectedStitchIds.length > 0 && (
        <p className="mb-2 text-xs text-blue-700">
          {t('editor.selectedCount', { count: selectedStitchIds.length })}
        </p>
      )}
      <div className="mb-2">
        <ToolPalette />
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {STITCHES.map(({ type, labelKey }) => (
          <button
            key={type}
            onPointerDown={(e) => onStitchPointerDown(e, type)}
            onPointerMove={onStitchPointerMove}
            onPointerUp={onStitchPointerUp}
            onPointerCancel={cancelPaletteDrag}
            aria-label={t(labelKey)}
            title={t(labelKey)}
            className={`flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-lg border select-none ${
              activeStitch === type
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 bg-white text-zinc-700'
            }`}
          >
            <StitchIcon type={type} />
          </button>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setColorOpen((o) => !o)}
            aria-label={t(currentColor.labelKey)}
            aria-expanded={colorOpen}
            className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 px-2"
          >
            <span
              className="h-5 w-5 shrink-0 rounded-full border border-zinc-200"
              style={{ backgroundColor: currentColor.value ?? '#18181b' }}
            />
            <svg viewBox="0 0 20 20" className="h-3 w-3 fill-zinc-500">
              <path d="M5 7l5 6 5-6z" />
            </svg>
          </button>

          {colorOpen && (
            <>
              <button
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => setColorOpen(false)}
                className="fixed inset-0 z-30 cursor-default"
              />
              <div
                role="listbox"
                aria-label={t('color.default')}
                className="absolute bottom-full left-0 z-40 mb-1 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg"
              >
                {COLORS.map(({ value, labelKey }) => (
                  <button
                    key={value ?? 'default'}
                    type="button"
                    role="option"
                    aria-selected={activeColor === value}
                    onClick={() => onColorClick(value)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-sm whitespace-nowrap ${
                      activeColor === value
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full border border-zinc-200"
                      style={{ backgroundColor: value ?? '#18181b' }}
                    />
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <GuideToggle />
        <ZoomControl />
      </div>

      {dragPreview && (
        <div
          className="pointer-events-none fixed z-50 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-900 bg-white/90 text-zinc-900 shadow-lg"
          style={{ left: dragPreview.clientX, top: dragPreview.clientY }}
        >
          <StitchIcon type={dragPreview.type} />
        </div>
      )}
    </div>
  )
}
