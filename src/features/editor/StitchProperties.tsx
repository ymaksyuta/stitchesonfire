import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import type { ThreadColors } from '../../types/pattern'

const COLOR_FIELDS: { key: keyof ThreadColors; labelKey: string }[] = [
  { key: 'activeRight', labelKey: 'thread.activeRight' },
  { key: 'activeWrong', labelKey: 'thread.activeWrong' },
  { key: 'passiveRight', labelKey: 'thread.passiveRight' },
  { key: 'passiveWrong', labelKey: 'thread.passiveWrong' },
]

/** Row of controls for the current selection's thread/layer/side/marker —
 * only rendered while something is selected. All actions apply to the
 * whole selection at once (see the store's `toggleSelected*`/
 * `setSelected*` actions). */
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
    addLayer,
    renameLayer,
  } = usePatternStore()

  const [threadOpen, setThreadOpen] = useState(false)
  const [layerOpen, setLayerOpen] = useState(false)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)

  const currentId = selectedStitchIds[selectedStitchIds.length - 1]
  const current = pattern.stitches.find((s) => s.id === currentId)
  if (!current) return null

  const currentThread = pattern.threads.find((th) => th.id === current.thread)
  const currentLayer = pattern.layers.find((l) => l.id === current.layer)

  return (
    <div className="mt-2 flex items-center gap-2 border-t border-zinc-100 pt-2">
      <button
        type="button"
        onClick={toggleSelectedSide}
        aria-label={t('editor.side')}
        title={t('editor.side')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-zinc-300 text-xs font-semibold text-zinc-700"
      >
        {current.side === 'right' ? t('editor.sideRightShort') : t('editor.sideWrongShort')}
      </button>

      <button
        type="button"
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

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setThreadOpen((v) => !v)}
          aria-label={t('editor.thread')}
          title={t('editor.thread')}
          className="flex h-9 items-center gap-2 rounded-md border border-zinc-300 px-2"
        >
          <span
            className="h-5 w-5 shrink-0 rounded-full border border-zinc-200"
            style={{ backgroundColor: currentThread?.colors.activeRight ?? '#18181b' }}
          />
          <span className="max-w-20 truncate text-xs text-zinc-700">
            {currentThread?.name ?? t('editor.thread')}
          </span>
        </button>

        {threadOpen && (
          <>
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => {
                setThreadOpen(false)
                setEditingThreadId(null)
              }}
              className="fixed inset-0 z-30 cursor-default touch-none"
            />
            <div className="absolute bottom-full left-0 z-40 mb-1 w-64 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
              {pattern.threads.map((th) => (
                <div key={th.id} className="border-b border-zinc-100 last:border-b-0">
                  <div className="flex items-center gap-1 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedThread(th.id)
                        setThreadOpen(false)
                        setEditingThreadId(null)
                      }}
                      className={`flex flex-1 items-center gap-2 rounded px-1 py-1 text-left text-sm ${
                        current.thread === th.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
                      }`}
                    >
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border border-zinc-200"
                        style={{ backgroundColor: th.colors.activeRight }}
                      />
                      <span className="truncate">{th.name ?? th.id}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingThreadId(editingThreadId === th.id ? null : th.id)}
                      aria-label={t('editor.editThread')}
                      className="shrink-0 rounded px-1.5 py-1 text-xs text-zinc-400"
                    >
                      ✎
                    </button>
                  </div>

                  {editingThreadId === th.id && (
                    <div className="space-y-2 px-3 pb-2">
                      <input
                        value={th.name ?? ''}
                        onChange={(e) => renameThread(th.id, e.target.value)}
                        placeholder={t('editor.thread')}
                        className="w-full rounded border border-zinc-200 px-2 py-1 text-sm"
                      />
                      {COLOR_FIELDS.map(({ key, labelKey }) => (
                        <label key={key} className="flex items-center justify-between text-xs text-zinc-500">
                          {t(labelKey)}
                          <input
                            type="color"
                            value={th.colors[key]}
                            onChange={(e) => setThreadColor(th.id, key, e.target.value)}
                            className="h-6 w-10 shrink-0 rounded border border-zinc-200"
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addThread}
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                + {t('editor.addThread')}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setLayerOpen((v) => !v)}
          aria-label={t('editor.layer')}
          title={t('editor.layer')}
          className="flex h-9 items-center gap-1 rounded-md border border-zinc-300 px-2 text-xs text-zinc-700"
        >
          <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M10 3l7 4-7 4-7-4 7-4z" />
            <path d="M3 11l7 4 7-4" />
          </svg>
          <span className="max-w-16 truncate">{currentLayer?.name ?? t('editor.layer')}</span>
        </button>

        {layerOpen && (
          <>
            <button
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setLayerOpen(false)}
              className="fixed inset-0 z-30 cursor-default touch-none"
            />
            <div className="absolute bottom-full left-0 z-40 mb-1 w-48 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
              {pattern.layers.map((l) => (
                <div key={l.id} className="flex items-center gap-1 border-b border-zinc-100 px-2 py-1 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLayer(l.id)
                      setLayerOpen(false)
                    }}
                    className={`flex-1 rounded px-1 py-1 text-left text-sm ${
                      current.layer === l.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-700'
                    }`}
                  >
                    {l.name ?? l.id}
                  </button>
                  <input
                    value={l.name ?? ''}
                    onChange={(e) => renameLayer(l.id, e.target.value)}
                    placeholder={l.id}
                    className="w-16 shrink-0 rounded border border-zinc-200 px-1 py-0.5 text-xs"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={addLayer}
                className="w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
              >
                + {t('editor.addLayer')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
