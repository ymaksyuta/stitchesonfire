import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { HELP_ELEMENTS, HELP_HOWTOS } from './helpRegistry'
import en from '../../i18n/locales/en/common.json'
import ru from '../../i18n/locales/ru/common.json'

// This test is the enforcement mechanism behind CLAUDE.md's "Interface
// help" rule: every data-help-id in the app must be registered, every
// registered element must actually be marked up somewhere, every howto
// step must point at a real element, and every help string must exist
// in every supported language. If the interface changes and the help
// content doesn't, this test is what catches it.

const SRC_DIR = dirname(fileURLToPath(import.meta.url)) + '/../..'

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules') continue
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) collectSourceFiles(full, out)
    // Skip test files themselves — this file's own regex source would
    // otherwise be scanned as if it were a real data-help-id attribute.
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

function findDataHelpIdsInSource(): Set<string> {
  const ids = new Set<string>()
  // Negative lookbehind excludes CSS attribute-selector usages like
  // `[data-help-id="${id}"]` (querySelector calls) — only literal JSX
  // attributes count as "this element is marked up".
  const pattern = /(?<!\[)data-help-id="([^"]+)"/g
  for (const file of collectSourceFiles(SRC_DIR)) {
    const text = readFileSync(file, 'utf8')
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text))) ids.add(match[1])
  }
  return ids
}

describe('help registry stays in sync with the interface', () => {
  const idsInSource = findDataHelpIdsInSource()
  const registeredIds = new Set(HELP_ELEMENTS.map((e) => e.id))

  it('found at least one data-help-id in the app (sanity check the scan itself works)', () => {
    expect(idsInSource.size).toBeGreaterThan(0)
  })

  it('every data-help-id in the app has a registry entry', () => {
    for (const id of idsInSource) {
      expect(registeredIds.has(id), `no HELP_ELEMENTS entry for data-help-id="${id}"`).toBe(true)
    }
  })

  it('every registry entry is actually marked up somewhere in the interface', () => {
    for (const entry of HELP_ELEMENTS) {
      expect(
        idsInSource.has(entry.id),
        `HELP_ELEMENTS "${entry.id}" has no matching data-help-id in the app — stale entry?`,
      ).toBe(true)
    }
  })

  it('every howto step that names an element points at a real registry entry', () => {
    for (const howto of HELP_HOWTOS) {
      for (const step of howto.steps) {
        if (!step.elementId) continue
        expect(
          registeredIds.has(step.elementId),
          `howto "${howto.id}" references unknown element "${step.elementId}"`,
        ).toBe(true)
      }
    }
  })

  it('every help i18n key has both an English and a Russian translation', () => {
    const keys = new Set<string>()
    for (const e of HELP_ELEMENTS) keys.add(e.i18nKey)
    for (const h of HELP_HOWTOS) {
      keys.add(h.titleKey)
      for (const step of h.steps) keys.add(step.textKey)
    }
    for (const key of keys) {
      expect(key in en, `missing English help text for "${key}"`).toBe(true)
      expect(key in ru, `missing Russian help text for "${key}"`).toBe(true)
    }
  })
})

describe('typical actions covered by the help system', () => {
  // The list itself: if a typical action stops being documented, or a
  // new one is added to the app without a howto, this is where it shows.
  const TYPICAL_ACTIONS = [
    'addStitches',
    'changeLanguage',
    'savePattern',
    'exportPdf',
    'undoMistake',
    'markSides',
  ]

  it('has a howto for every typical action, and no undocumented extras', () => {
    const howtoIds = HELP_HOWTOS.map((h) => h.id)
    expect(new Set(howtoIds)).toEqual(new Set(TYPICAL_ACTIONS))
  })

  it('every howto has at least one step', () => {
    for (const howto of HELP_HOWTOS) {
      expect(howto.steps.length, `howto "${howto.id}" has no steps`).toBeGreaterThan(0)
    }
  })
})
