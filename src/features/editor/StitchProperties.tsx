import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import { useLongPress } from './useLongPress'

/** Row of controls for the current selection's thread/layer/side/marker —
 * only rendered while something is selected. Side/marker toggles apply to
 * the whole selection; the thread/layer pickers assign the whole
 * selection too, but their settings popups (color+loop size; grid+shift)
 * always edit the *current* (last-selected) stitch's thread/layer, same
 * as everywhere else "current" means the last-selected stitch.
 *
 * Interaction contract, matching the rest of the toolbar: tap picks from
 * a quick-select list; long-press or right-click opens a settings popup
 * for the current item. */
export function StitchProperties() {
  const { t } = useTranslation()
  const {
    pattern,
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

  const currentId = selectedStitchIds[selectedStitchIds.length - 1]
  const current = pattern.stitches.find((s) => s.id === currentId)
  if (!current) return null

  const currentThread = pattern.threads.find((th) => th.id === current.thread)
  const currentLayer = pattern.layers.find((l) => l.id === current.layer)

  return (
    <div className="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2">
      <button
        type="button"
        data-help-id="properties.side"
        onClick={toggleSelectedSide}
        aria-label={t('editor.side')}
        title={t('editor.side')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-xs font-semibold text-zinc-700"
      >
        {current.side === 'right' ? t('editor.sideRightShort') : t('editor.sideWrongShort')}
      </button>

      <button
        type="button"
        data-help-id="properties.marker"
        onClick={toggleSelectedMarker}
        aria-label={t('editor.marker')}
        aria-pressed={!!current.marker}
        title={t('editor.marker')}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${
          current.marker ? 'border-amber-400 bg-amber-50' : 'border-zinc-300'
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4">
          <circle
            cx="10"
            cy="10"
            r="6"
            fill={current.marker ? '#facc15' : 'none'}
            stroke={current.marker ? '#f59e0b' : '#a1a1aa'}
            strokeWidth="1.6"
          />
        </svg>
      </button>

      {/* Thread */}
      <div className="relative shrink-0">
        <button
          type="button"
          data-help-id="properties.thread"
          {...threadLongPress}
          aria-label={t('editor.thread')}
          title={t('editor.thread')}
          className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 px-2 select-none"
        >
          <span
            className="h-5 w-5 shrink-0 rounded-full border border-zinc-200"
            style={{ backgroundColor: currentThread?.color ?? '#18181b' }}
          />
          <span className="max-w-20 truncate text-xs text-zinc-700">
            {currentThread?.name ?? t('editor.thread')}
          </span>
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
                    current.thread === th.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
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
          aria-label={t('editor.layer')}
          title={t('editor.layer')}
          className="flex h-9 items-center gap-1 rounded-md border border-zinc-300 px-2 text-xs text-zinc-700 select-none"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M10 3l7 4-7 4-7-4 7-4z" />
            <path d="M3 11l7 4 7-4" />
          </svg>
          <span className="max-w-16 truncate">{currentLayer?.name ?? t('editor.layer')}</span>
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
                    current.layer === l.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
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
