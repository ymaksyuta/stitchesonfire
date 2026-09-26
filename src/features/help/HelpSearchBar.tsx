import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useHelpStore } from './helpStore'
import { HELP_ELEMENTS, HELP_HOWTOS } from './helpRegistry'

/** Replaces the pattern-name field in the header while inspect mode is
 * on, and searches across both element descriptions and howto guides. */
export function HelpSearchBar() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const openElementHelp = useHelpStore((s) => s.openElementHelp)
  const openPanel = useHelpStore((s) => s.openPanel)

  const q = query.trim().toLowerCase()
  const elementMatches = q
    ? HELP_ELEMENTS.filter((e) => t(e.i18nKey).toLowerCase().includes(q)).slice(0, 4)
    : []
  const howtoMatches = q
    ? HELP_HOWTOS.filter((h) => t(h.titleKey).toLowerCase().includes(q)).slice(0, 3)
    : []
  const hasResults = elementMatches.length > 0 || howtoMatches.length > 0

  return (
    <div className="relative min-w-0 flex-1" data-help-toggle="true">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('help.searchPlaceholder')}
        aria-label={t('help.searchPlaceholder')}
        className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:outline-none"
      />

      {hasResults && (
        <div className="absolute left-0 top-full z-40 mt-1 w-full overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg">
          {elementMatches.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => openElementHelp(e.id)}
              className="block w-full px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            >
              {t(e.i18nKey)}
            </button>
          ))}
          {howtoMatches.map((h) => (
            <button
              key={h.id}
              type="button"
              onClick={openPanel}
              className="block w-full border-t border-zinc-100 px-3 py-2 text-left text-sm text-zinc-800 hover:bg-zinc-50"
            >
              {t(h.titleKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
