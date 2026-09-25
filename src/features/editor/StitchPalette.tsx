import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import { ALL_STITCH_TYPES, type StitchType } from '../../types/pattern'
import { GLYPH_VARIANTS } from './stitchGlyphs'
import { GuideToggle } from './GuideToggle'
import { SequenceToggle } from './SequenceToggle'
import { SideContrastToggle } from './SideContrastToggle'
import { ZoomControl } from './ZoomControl'
import { ResetViewButton } from './ResetViewButton'
import { StitchIcon } from './StitchIcon'
import { ToolPalette } from './ToolPalette'
import { StitchProperties } from './StitchProperties'

const LABELS: Record<StitchType, string> = {
  chain: 'stitch.chain',
  single: 'stitch.single',
  double: 'stitch.double',
  slipStitch: 'stitch.slipStitch',
}

// Muted, business-appropriate accents — not a full rainbow.
const COLORS: { value: string | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: 'color.default' },
  { value: '#b45309', labelKey: 'color.amber' },
  { value: '#b91c1c', labelKey: 'color.rust' },
  { value: '#166534', labelKey: 'color.sage' },
  { value: '#1d4ed8', labelKey: 'color.slateBlue' },
]

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 10

export function StitchPalette() {
  const { t } = useTranslation()
  const {
    pattern,
    activeStitch,
    setActiveStitch,
    activeColor,
    setActiveColor,
    beginPaletteDrag,
    updatePaletteDrag,
    endPaletteDrag,
    cancelPaletteDrag,
    dragPreview,
    visibleStitchTypes,
    toggleVisibleStitchType,
    setGlyphVariant,
  } = usePatternStore()

  const [colorOpen, setColorOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [tooltipType, setTooltipType] = useState<StitchType | null>(null)
  const [variantPickerFor, setVariantPickerFor] = useState<StitchType | null>(null)
  const currentColor = COLORS.find((c) => c.value === activeColor) ?? COLORS[0]

  const downRef = useRef<{ x: number; y: number; type: StitchType } | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rowLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearLongPressTimer = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  const onStitchPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    type: StitchType,
  ) => {
    downRef.current = { x: e.clientX, y: e.clientY, type }
    e.currentTarget.setPointerCapture(e.pointerId)
    beginPaletteDrag(type, activeColor, e.clientX, e.clientY)
    clearLongPressTimer()
    longPressTimer.current = setTimeout(() => {
      setTooltipType(type)
      cancelPaletteDrag()
      downRef.current = null // long-press consumes the gesture
    }, LONG_PRESS_MS)
  }

  const onStitchPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (downRef.current) {
      const moved =
        Math.hypot(e.clientX - downRef.current.x, e.clientY - downRef.current.y) >
        MOVE_CANCEL_PX
      if (moved) clearLongPressTimer()
    }
    if (dragPreview) updatePaletteDrag(e.clientX, e.clientY)
  }

  const onStitchPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    clearLongPressTimer()
    setTooltipType(null)
    const start = downRef.current
    downRef.current = null
    if (!start) return // consumed by a long-press already

    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_CANCEL_PX
    if (!moved) {
      // A plain tap toggles the active type on/off, mirroring how tools
      // toggle — tapping the already-active type selects "no type".
      setActiveStitch(activeStitch === start.type ? null : start.type)
      cancelPaletteDrag()
      return
    }
    endPaletteDrag()
  }

  const onColorClick = (value: string | undefined) => {
    setActiveColor(value)
    setColorOpen(false)
  }

  const visibleStitches = ALL_STITCH_TYPES.filter((t) => visibleStitchTypes.includes(t))

  return (
    <div className="p-2">
      <div className="mb-2">
        <ToolPalette />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 gap-2 overflow-x-auto">
          {visibleStitches.map((type) => (
            <div key={type} className="relative shrink-0">
              <button
                onPointerDown={(e) => onStitchPointerDown(e, type)}
                onPointerMove={onStitchPointerMove}
                onPointerUp={onStitchPointerUp}
                onPointerCancel={() => {
                  clearLongPressTimer()
                  downRef.current = null
                  setTooltipType(null)
                  cancelPaletteDrag()
                }}
                aria-label={t(LABELS[type])}
                className={`flex h-11 w-11 touch-none items-center justify-center rounded-lg border select-none ${
                  activeStitch === type
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-300 bg-white text-zinc-700'
                }`}
              >
                <StitchIcon type={type} variantId={pattern.glyphVariants?.[type]} />
              </button>
              {tooltipType === type && (
                <div className="pointer-events-none absolute bottom-full left-1/2 mb-1 -translate-x-1/2 rounded bg-zinc-900 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg">
                  {t(LABELS[type])}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              setPickerOpen((o) => !o)
              setVariantPickerFor(null)
            }}
            aria-label={t('editor.moreStitchTypes')}
            aria-expanded={pickerOpen}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-300 bg-white text-zinc-700"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
              <circle cx="4" cy="10" r="1.6" />
              <circle cx="10" cy="10" r="1.6" />
              <circle cx="16" cy="10" r="1.6" />
            </svg>
          </button>

          {pickerOpen && (
            <>
              <button
                aria-hidden="true"
                tabIndex={-1}
                onClick={() => {
                  setPickerOpen(false)
                  setVariantPickerFor(null)
                }}
                className="fixed inset-0 z-30 cursor-default touch-none"
              />
              <div className="absolute bottom-full left-0 z-40 mb-1 w-56 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
                {ALL_STITCH_TYPES.map((type) => {
                  const visible = visibleStitchTypes.includes(type)
                  const variants = GLYPH_VARIANTS[type]
                  const hasVariants = variants.length > 1
                  const selectedVariantId = pattern.glyphVariants?.[type] ?? variants[0].id

                  const onRowPointerDown = () => {
                    if (rowLongPressTimer.current) clearTimeout(rowLongPressTimer.current)
                    rowLongPressTimer.current = setTimeout(() => {
                      if (hasVariants) setVariantPickerFor(type)
                      rowLongPressTimer.current = null
                    }, LONG_PRESS_MS)
                  }
                  const onRowPointerUp = () => {
                    if (rowLongPressTimer.current) {
                      clearTimeout(rowLongPressTimer.current)
                      rowLongPressTimer.current = null
                      toggleVisibleStitchType(type)
                    }
                    // else: a long-press already fired and opened the
                    // variant picker — don't also toggle visibility.
                  }

                  return (
                    <div key={type} className="relative">
                      <button
                        type="button"
                        role="option"
                        aria-selected={visible}
                        onPointerDown={onRowPointerDown}
                        onPointerUp={onRowPointerUp}
                        onPointerLeave={() => {
                          if (rowLongPressTimer.current) clearTimeout(rowLongPressTimer.current)
                          rowLongPressTimer.current = null
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          if (rowLongPressTimer.current) clearTimeout(rowLongPressTimer.current)
                          rowLongPressTimer.current = null
                          if (hasVariants) setVariantPickerFor(type)
                        }}
                        className="flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2 text-left text-sm text-zinc-800 select-none hover:bg-zinc-50"
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                            visible ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-300'
                          }`}
                        >
                          {visible && (
                            <svg viewBox="0 0 20 20" className="h-3 w-3" fill="currentColor">
                              <path d="M4 10l4 4 8-8-1.4-1.4L8 11.2 5.4 8.6z" />
                            </svg>
                          )}
                        </span>
                        <StitchIcon type={type} variantId={selectedVariantId} />
                        <span className="flex-1">{t(LABELS[type])}</span>
                      </button>

                      {variantPickerFor === type && (
                        <>
                          <button
                            aria-hidden="true"
                            tabIndex={-1}
                            onClick={() => setVariantPickerFor(null)}
                            className="fixed inset-0 z-40 cursor-default touch-none"
                          />
                          <div className="absolute left-full top-0 z-50 ml-1 w-44 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
                            {variants.map((variant) => (
                              <button
                                key={variant.id}
                                type="button"
                                role="option"
                                aria-selected={variant.id === selectedVariantId}
                                onClick={() => {
                                  setGlyphVariant(type, variant.id)
                                  setVariantPickerFor(null)
                                }}
                                className={`flex w-full items-center gap-2 border-t border-zinc-100 px-3 py-2 text-left text-sm first:border-t-0 ${
                                  variant.id === selectedVariantId
                                    ? 'bg-zinc-100 text-zinc-900'
                                    : 'text-zinc-700 hover:bg-zinc-50'
                                }`}
                              >
                                <StitchIcon type={type} variantId={variant.id} />
                                {t(variant.labelKey)}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
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
                className="fixed inset-0 z-30 cursor-default touch-none"
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
        <SequenceToggle />
        <SideContrastToggle />
        <ZoomControl />
        <ResetViewButton />
      </div>

      <StitchProperties />

      {dragPreview && (
        <div
          className="pointer-events-none fixed z-50 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-zinc-900 bg-white/90 text-zinc-900 shadow-lg"
          style={{ left: dragPreview.clientX, top: dragPreview.clientY }}
        >
          <StitchIcon type={dragPreview.type} variantId={pattern.glyphVariants?.[dragPreview.type]} />
        </div>
      )}
    </div>
  )
}
