import { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import {
  savePattern,
  listPatterns,
  deletePattern,
} from '../../db/patterns'
import type { Pattern } from '../../types/pattern'

export function PatternManager() {
  const { t } = useTranslation()
  const { pattern, loadPattern, reset } = usePatternStore()
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [name, setName] = useState(pattern.name)
  const [justSaved, setJustSaved] = useState(false)
  const [open, setOpen] = useState(false)

  const refresh = useCallback(async () => {
    const all = await listPatterns()
    all.sort((a, b) => b.updatedAt - a.updatedAt)
    setPatterns(all)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    setName(pattern.name)
  }, [pattern.id, pattern.name])

  const handleSave = async () => {
    const toSave: Pattern = { ...pattern, name: name.trim() || t('editor.untitled'), updatedAt: Date.now() }
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
    <div className="border-t border-zinc-200 bg-white px-3 py-2">
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-zinc-300 px-2 py-1.5 text-sm"
          aria-label={t('editor.untitled')}
        />
        <button
          onClick={handleSave}
          className="shrink-0 rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white"
        >
          {justSaved ? t('editor.saved') : t('editor.save')}
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700"
        >
          {t('editor.myPatterns')}
        </button>
      </div>

      {open && (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-zinc-200">
          <button
            onClick={handleNew}
            className="block w-full border-b border-zinc-100 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
          >
            + {t('editor.newPattern')}
          </button>
          {patterns.length === 0 && (
            <p className="px-3 py-3 text-sm text-zinc-400">
              {t('editor.noPatterns')}
            </p>
          )}
          {patterns.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-zinc-100 px-3 py-2 last:border-b-0"
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
      )}
    </div>
  )
}
