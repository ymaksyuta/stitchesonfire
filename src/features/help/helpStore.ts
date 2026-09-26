import { create } from 'zustand'

/**
 * Ephemeral UI state for the help system. Deliberately separate from
 * `patternStore` — none of this is pattern data or undo history, it's
 * just "what is the help UI currently showing".
 */
interface HelpState {
  /** "?" mode: cursor changes, clicks on data-help-id elements open help
   * instead of activating them. */
  inspectMode: boolean
  toggleInspectMode: () => void
  exitInspectMode: () => void

  /** The element whose short description popup is currently shown. */
  activeElementId: string | null
  openElementHelp: (id: string) => void
  closeElementHelp: () => void

  /** The full searchable help panel (opened from the app menu). Query
   * and scroll position live here, not in local component state, so
   * reopening the panel after following a link lands back where the
   * person left off instead of resetting to the top. */
  panelOpen: boolean
  openPanel: () => void
  closePanel: () => void
  panelQuery: string
  setPanelQuery: (q: string) => void
  panelScrollTop: number
  setPanelScrollTop: (y: number) => void
}

export const useHelpStore = create<HelpState>((set) => ({
  inspectMode: false,
  toggleInspectMode: () =>
    set((s) => ({ inspectMode: !s.inspectMode, activeElementId: null })),
  exitInspectMode: () => set({ inspectMode: false, activeElementId: null }),

  activeElementId: null,
  openElementHelp: (id) => set({ activeElementId: id }),
  closeElementHelp: () => set({ activeElementId: null }),

  panelOpen: false,
  openPanel: () => set({ panelOpen: true, inspectMode: false, activeElementId: null }),
  closePanel: () => set({ panelOpen: false }),
  panelQuery: '',
  setPanelQuery: (q) => set({ panelQuery: q }),
  panelScrollTop: 0,
  setPanelScrollTop: (y) => set({ panelScrollTop: y }),
}))

/** Scrolls a help-registered element into view and briefly highlights it.
 * Used by howto steps and the element list in the full help panel. */
export function highlightHelpElement(id: string) {
  const el = document.querySelector<HTMLElement>(`[data-help-id="${id}"]`)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  el.classList.add('help-highlight')
  window.setTimeout(() => el.classList.remove('help-highlight'), 1500)
}
