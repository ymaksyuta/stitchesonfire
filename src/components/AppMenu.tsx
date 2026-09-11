import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../store/patternStore'
import { savePattern, listPatterns, deletePattern } from '../db/patterns'
import type { Pattern } from '../types/pattern'

export function AppMenu() {
  const { t } = useTranslation()
  const { pattern, loadPattern, reset } = usePatternStore()
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [open, setOpen] = useState(false)
  const [justSaved, setJustSaved] = useState(false)

  const refresh = useCallback(async () => {
    const all = await listPatterns()
    all.sort((a, b) => b.updatedAt - a.updatedAt)
    setPatterns(all)
  }, [])

  useEffect(() => {
    if (open) refresh()
  }, [open, refresh])

  const handleSave = async () => {
    const toSave: Pattern = { ...pattern, updatedAt: Date.now() }
    await savePattern(toSave)
    loadPattern(toSave)
    await refresh()
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  const handleLoad = (p: Pattern) => {
    loadPattern(p)
    setOpen(false)
  }

  const handleDelete = async (id: string) => {
    await deletePattern(id)
    await refresh()
  }

  const handleNew = () => {
    reset()
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('editor.menu')}
        aria-expanded={open}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 text-zinc-700"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor">
          <rect x="2" y="4" width="16" height="1.6" rx="0.8" />
          <rect x="2" y="9.2" width="16" height="1.6" rx="0.8" />
          <rect x="2" y="14.4" width="16" height="1.6" rx="0.8" />
        </svg>
      </button>

      {open && (
        <>
          <button
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div className="absolute left-0 top-full z-40 mt-1 w-64 overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
            <button
              onClick={handleSave}
              className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            >
              {justSaved ? t('editor.saved') : t('editor.save')}
            </button>
            <button
              onClick={handleNew}
              className="block w-full border-t border-zinc-100 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            >
              + {t('editor.newPattern')}
            </button>
            <div className="max-h-56 overflow-y-auto border-t border-zinc-100">
              <p className="px-3 py-1.5 text-xs text-zinc-400">
                {t('editor.myPatterns')}
              </p>
              {patterns.length === 0 && (
                <p className="px-3 py-3 text-sm text-zinc-400">
                  {t('editor.noPatterns')}
                </p>
              )}
              {patterns.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between border-t border-zinc-100 px-3 py-2"
                >
                  <button
                    onClick={() => handleLoad(p)}
                    className="min-w-0 flex-1 truncate text-left text-sm text-zinc-800"
                  >
                    {p.name || t('editor.untitled')}
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="ml-2 shrink-0 text-sm text-red-600"
                    aria-label={t('editor.delete')}
                  >
                    {t('editor.delete')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
