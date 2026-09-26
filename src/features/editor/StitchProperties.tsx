import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import { useLongPress } from './useLongPress'

// Muted, business-appropriate accents — not a full rainbow.
const COLORS: { value: string | undefined; labelKey: string }[] = [
  { value: undefined, labelKey: 'color.default' },
  { value: '#b45309', labelKey: 'color.amber' },
  { value: '#b91c1c', labelKey: 'color.rust' },
  { value: '#166534', labelKey: 'color.sage' },
  { value: '#1d4ed8', labelKey: 'color.slateBlue' },
]

// Restrained-but-colored accents for each property icon, so the toolbar
// doesn't read as an all-gray wall — one muted hue per control, distinct
// from the others and from the stitch-glyph icons (which stay plain
// black-on-white/print-style, since those are the actual chart symbols).
const SIDE_COLOR = '#4338ca' // indigo
const MARKER_COLOR = '#f97316' // orange
const MARKER_STROKE = '#c2410c'
const LAYER_COLOR = '#a21caf' // fuchsia

/** "Properties" toolbar group: override color, side, marker, thread, layer.
 * Always rendered (toolbars stay visible even with nothing selected), and
 * every control here is always live: side/marker/thread/layer each carry
 * an "active" value (mirroring activeColor/activeStitch) that stamps new
 * stitches, and additionally applies to the current selection when there
 * is one — never disabled, never dimmed.
 *
 * Icons are deliberately distinct from each other so they don't get
 * confused at a glance: override color is a plain swatch circle, side is
 * a folded-corner square (fold flips which face is "shown"), marker is a
 * solid drop/pin, thread is a wound yarn ball with a smooth strand
 * (stroked in the thread's own color, so it reads as "thread" rather
 * than a second color swatch), layer keeps its stacked-sheets glyph.
 *
 * Interaction contract, matching the rest of the toolbar: tap picks from
 * a quick-select list; long-press or right-click opens a settings popup
 * for the current item. */
export function StitchProperties() {
  const { t } = useTranslation()
  const {
    pattern,
    activeColor,
    setActiveColor,
    selectedStitchIds,
    activeSide,
    activeMarker,
    activeThread,
    activeLayer,
    toggleSide,
    toggleMarker,
    setThread,
    setLayer,
    addThread,
    renameThread,
    setThreadColor,
    setThreadLoopSize,
    addLayer,
    renameLayer,
    setLayerGridKind,
    setLayerShift,
  } = usePatternStore()

  const [colorOpen, setColorOpen] = useState(false)
  const [threadListOpen, setThreadListOpen] = useState(false)
  const [threadSettingsOpen, setThreadSettingsOpen] = useState(false)
  const [layerListOpen, setLayerListOpen] = useState(false)
  const [layerSettingsOpen, setLayerSettingsOpen] = useState(false)

  const threadLongPress = useLongPress(
    () => setThreadSettingsOpen(true),
    () => setThreadListOpen(true),
  )
  const layerLongPress = useLongPress(
    () => setLayerSettingsOpen(true),
    () => setLayerListOpen(true),
  )

  const currentColor = COLORS.find((c) => c.value === activeColor) ?? COLORS[0]

  // With a selection, these controls show (and edit) the current
  // stitch's own values; with none, they show (and edit) the active
  // defaults that will be stamped onto the next new stitch — either
  // way there's always a concrete value to display, never a gap.
  const currentId = selectedStitchIds[selectedStitchIds.length - 1]
  const current = pattern.stitches.find((s) => s.id === currentId)
  const displaySide = current?.side ?? activeSide
  const displayMarker = current?.marker ?? activeMarker

  const displayThreadId = current?.thread ?? activeThread
  const displayLayerId = current?.layer ?? activeLayer
  const currentThread =
    pattern.threads.find((th) => th.id === displayThreadId) ?? pattern.threads[0]
  const currentLayer =
    pattern.layers.find((l) => l.id === displayLayerId) ?? pattern.layers[0]

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2">
      {/* Override color */}
      <div className="relative shrink-0">
        <button
          type="button"
          data-help-id="palette.colorPicker"
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
                  onClick={() => {
                    setActiveColor(value)
                    setColorOpen(false)
                  }}
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

      {/* Side: folded-corner square. Right side shows the face filled;
          wrong side flips it — the folded flap fills instead. Always
          active: with a selection it flips that selection, with none it
          sets what the next new stitch will use. */}
      <button
        type="button"
        data-help-id="properties.side"
        onClick={toggleSide}
        aria-label={t('editor.side')}
        aria-pressed={displaySide === 'wrong'}
        title={`${t('editor.side')}: ${
          displaySide === 'right' ? t('editor.sideRightShort') : t('editor.sideWrongShort')
        }`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4">
          <path
            d="M3 3h9l5 5v9H3z"
            fill={displaySide === 'right' ? SIDE_COLOR : 'none'}
            stroke={SIDE_COLOR}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M12 3l5 5h-5z"
            fill={displaySide === 'wrong' ? SIDE_COLOR : '#fff'}
            stroke={SIDE_COLOR}
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Marker: a plain drop/pin, orange when set. Always active, same
          selection-or-default rule as side above. */}
      <button
        type="button"
        data-help-id="properties.marker"
        onClick={toggleMarker}
        aria-label={t('editor.marker')}
        aria-pressed={displayMarker}
        title={t('editor.marker')}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
          displayMarker ? 'border-orange-500 bg-orange-50' : 'border-zinc-300'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4">
          <path
            d="M10 2.5a5.5 5.5 0 00-5.5 5.5c0 4.2 5.5 9.5 5.5 9.5s5.5-5.3 5.5-9.5A5.5 5.5 0 0010 2.5z"
            fill={displayMarker ? MARKER_COLOR : 'none'}
            stroke={displayMarker ? MARKER_STROKE : '#a1a1aa'}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Thread: a wound yarn ball with a smooth strand running off it,
          stroked/filled in the thread's own color — reads as "thread",
          not as another flat color-swatch circle. */}
      <div className="relative shrink-0">
        <button
          type="button"
          data-help-id="properties.thread"
          {...threadLongPress}
          aria-label={`${t('editor.thread')}: ${currentThread?.name ?? ''}`}
          title={`${t('editor.thread')}: ${currentThread?.name ?? ''}`}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 select-none"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4">
            <circle cx="5.5" cy="14.5" r="3.4" fill={currentThread?.color ?? '#18181b'} />
            <path
              d="M2.3 13.2c1.8 2 4.6 2 6.4 0"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.55"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            <path
              d="M2.6 16.1c1.6-1.7 4.4-1.7 6 0"
              fill="none"
              stroke="#fff"
              strokeOpacity="0.55"
              strokeWidth="0.9"
              strokeLinecap="round"
            />
            <path
              d="M7.6 12.8c2-2.2 1.6-4.9 3.2-6.8 1.3-1.6 3.3-2 5.4-1.6"
              fill="none"
              stroke={currentThread?.color ?? '#18181b'}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {threadListOpen && (
          <>
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setThreadListOpen(false)}
              className="fixed inset-0 z-30 cursor-default touch-none"
            />
            <div className="absolute bottom-full left-0 z-40 mb-1 w-48 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
              {pattern.threads.map((th) => (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => {
                    setThread(th.id)
                    setThreadListOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                    displayThreadId === th.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
                  }`}
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-zinc-200"
                    style={{ backgroundColor: th.color }}
                  />
                  <span className="truncate">{th.name ?? th.id}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  addThread()
                  setThreadListOpen(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                + {t('editor.addThread')}
              </button>
            </div>
          </>
        )}

        {threadSettingsOpen && currentThread && (
          <>
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setThreadSettingsOpen(false)}
              className="fixed inset-0 z-30 cursor-default touch-none"
            />
            <div className="absolute bottom-full left-0 z-40 mb-1 w-56 space-y-2 rounded-md border border-zinc-200 bg-white p-3 shadow-lg">
              <input
                value={currentThread.name ?? ''}
                onChange={(e) => renameThread(currentThread.id, e.target.value)}
                placeholder={t('editor.thread')}
                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              />
              <label className="flex items-center justify-between text-xs text-zinc-500">
                {t('editor.threadColor')}
                <input
                  type="color"
                  value={currentThread.color}
                  onChange={(e) => setThreadColor(currentThread.id, e.target.value)}
                  className="h-6 w-10 shrink-0 rounded border border-zinc-200"
                />
              </label>
              <label className="flex items-center justify-between text-xs text-zinc-500">
                {t('editor.loopSize')}
                <input
                  type="number"
                  min={0}
                  step={0.25}
                  value={currentThread.turningLoopSize ?? ''}
                  onChange={(e) =>
                    setThreadLoopSize(
                      currentThread.id,
                      e.target.value === '' ? undefined : Number(e.target.value),
                    )
                  }
                  className="w-16 shrink-0 rounded border border-zinc-200 px-2 py-1 text-right text-sm"
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Layer */}
      <div className="relative shrink-0">
        <button
          type="button"
          data-help-id="properties.layer"
          {...layerLongPress}
          aria-label={`${t('editor.layer')}: ${currentLayer?.name ?? ''}`}
          title={`${t('editor.layer')}: ${currentLayer?.name ?? ''}`}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 select-none"
        >
          <svg
            viewBox="0 0 20 20"
            className="h-4 w-4"
            fill="none"
            stroke={LAYER_COLOR}
            strokeWidth="1.4"
          >
            <path d="M10 3l7 4-7 4-7-4 7-4z" fill={LAYER_COLOR} fillOpacity="0.25" />
            <path d="M3 11l7 4 7-4" />
          </svg>
        </button>

        {layerListOpen && (
          <>
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setLayerListOpen(false)}
              className="fixed inset-0 z-30 cursor-default touch-none"
            />
            <div className="absolute bottom-full left-0 z-40 mb-1 w-48 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
              {pattern.layers.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => {
                    setLayer(l.id)
                    setLayerListOpen(false)
                  }}
                  className={`block w-full border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                    displayLayerId === l.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
                  }`}
                >
                  {l.name ?? l.id}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  addLayer()
                  setLayerListOpen(false)
                }}
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                + {t('editor.addLayer')}
              </button>
            </div>
          </>
        )}

        {layerSettingsOpen && currentLayer && (
          <>
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setLayerSettingsOpen(false)}
              className="fixed inset-0 z-30 cursor-default touch-none"
            />
            <div className="absolute bottom-full left-0 z-40 mb-1 w-60 space-y-2 rounded-md border border-zinc-200 bg-white p-3 shadow-lg">
              <input
                value={currentLayer.name ?? ''}
                onChange={(e) => renameLayer(currentLayer.id, e.target.value)}
                placeholder={t('editor.layer')}
                className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              />

              <div className="flex gap-1">
                {(['rectangular', 'radial'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setLayerGridKind(currentLayer.id, kind)}
                    className={`flex-1 rounded border px-2 py-1 text-xs ${
                      currentLayer.grid.kind === kind
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-300 text-zinc-700'
                    }`}
                  >
                    {kind === 'rectangular' ? t('editor.gridRectangular') : t('editor.gridRadial')}
                  </button>
                ))}
              </div>

              <p className="pt-1 text-xs text-zinc-400">{t('editor.layerShift')}</p>
              <div className="flex gap-2">
                {(['x', 'y', 'angle'] as const).map((axis) => (
                  <label key={axis} className="flex-1 text-xs text-zinc-500">
                    {axis === 'angle' ? '°' : axis}
                    <input
                      type="number"
                      step={axis === 'angle' ? 1 : 0.25}
                      value={currentLayer.shift[axis]}
                      onChange={(e) =>
                        setLayerShift(currentLayer.id, axis, Number(e.target.value))
                      }
                      className="mt-0.5 w-full rounded border border-zinc-200 px-1.5 py-1 text-right text-sm"
                    />
                  </label>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
