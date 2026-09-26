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

const MARKER_COLOR = '#ea580c'

/** "Properties" toolbar group: override color, side, marker, thread, layer.
 * Always rendered (toolbars stay visible even with nothing selected) —
 * side/marker act on the current selection and are simply inert (dimmed)
 * with none; thread/layer stay fully usable either way since they also
 * manage the pattern's thread/layer list, not just the selection.
 *
 * Icons are deliberately distinct from each other so they don't get
 * confused at a glance: override color is a plain swatch circle, side is
 * a folded-corner square (fold flips which face is "shown"), marker is a
 * solid drop/pin, thread is a wavy strand (its stroke carries the
 * thread's color instead of a filled circle, so it doesn't read as a
 * second color swatch), layer keeps its stacked-sheets glyph.
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
    toggleSelectedSide,
    toggleSelectedMarker,
    setSelectedThread,
    setSelectedLayer,
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

  const hasSelection = selectedStitchIds.length > 0
  const currentId = selectedStitchIds[selectedStitchIds.length - 1]
  const current = pattern.stitches.find((s) => s.id === currentId)
  const currentSide = current?.side ?? 'right'
  const currentMarker = current?.marker ?? false

  const currentThread =
    pattern.threads.find((th) => th.id === current?.thread) ?? pattern.threads[0]
  const currentLayer =
    pattern.layers.find((l) => l.id === current?.layer) ?? pattern.layers[0]

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
          wrong side flips it — the folded flap fills instead. */}
      <button
        type="button"
        data-help-id="properties.side"
        onClick={toggleSelectedSide}
        aria-label={t('editor.side')}
        title={`${t('editor.side')}: ${
          currentSide === 'right' ? t('editor.sideRightShort') : t('editor.sideWrongShort')
        }`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 ${
          hasSelection ? '' : 'opacity-40'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4">
          <path
            d="M3 3h9l5 5v9H3z"
            fill={currentSide === 'right' ? '#18181b' : 'none'}
            stroke="#3f3f46"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
          <path
            d="M12 3l5 5h-5z"
            fill={currentSide === 'wrong' ? '#18181b' : '#fff'}
            stroke="#3f3f46"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Marker: a plain drop/pin, orange when set. */}
      <button
        type="button"
        data-help-id="properties.marker"
        onClick={toggleSelectedMarker}
        aria-label={t('editor.marker')}
        aria-pressed={currentMarker}
        title={t('editor.marker')}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
          currentMarker ? 'border-orange-500 bg-orange-50' : 'border-zinc-300'
        } ${hasSelection ? '' : 'opacity-40'}`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4">
          <path
            d="M10 2.5a5.5 5.5 0 00-5.5 5.5c0 4.2 5.5 9.5 5.5 9.5s5.5-5.3 5.5-9.5A5.5 5.5 0 0010 2.5z"
            fill={currentMarker ? MARKER_COLOR : 'none'}
            stroke={currentMarker ? '#c2410c' : '#a1a1aa'}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Thread: a wavy strand, stroked in the thread's own color, so it
          never reads as another color-swatch circle. */}
      <div className="relative shrink-0">
        <button
          type="button"
          data-help-id="properties.thread"
          {...threadLongPress}
          aria-label={`${t('editor.thread')}: ${currentThread?.name ?? ''}`}
          title={`${t('editor.thread')}: ${currentThread?.name ?? ''}`}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 select-none"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path
              d="M2.5 15 6 5l4 10 4-10 3.5 10"
              stroke={currentThread?.color ?? '#18181b'}
              strokeWidth="1.8"
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
                    setSelectedThread(th.id)
                    setThreadListOpen(false)
                  }}
                  className={`flex w-full items-center gap-2 border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                    current?.thread === th.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
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
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M10 3l7 4-7 4-7-4 7-4z" />
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
                    setSelectedLayer(l.id)
                    setLayerListOpen(false)
                  }}
                  className={`block w-full border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                    current?.layer === l.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
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
