import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'sof-settings'

interface StoredSettings {
  theme: Theme
}

function loadStored(): StoredSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { theme: 'system' }
    const parsed = JSON.parse(raw)
    const theme: Theme =
      parsed?.theme === 'light' || parsed?.theme === 'dark' || parsed?.theme === 'system'
        ? parsed.theme
        : 'system'
    return { theme }
  } catch {
    return { theme: 'system' }
  }
}

function persist(settings: StoredSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage can fail (private browsing, quota) — theme just won't
    // survive a reload, which is fine, not worth surfacing to the user.
  }
}

/**
 * App-wide settings, separate from `patternStore` (which holds one
 * pattern's data + undo history) — this is cross-pattern UI/app state,
 * persisted to localStorage directly (no zustand persist middleware
 * needed for a single small field). More settings accumulate here over
 * time, per the "Настройки" window design.
 */
interface SettingsState {
  theme: Theme
  setTheme: (theme: Theme) => void
  /** Whether the global Settings window is open. */
  settingsOpen: boolean
  openSettings: () => void
  closeSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...loadStored(),
  setTheme: (theme) => {
    set({ theme })
    persist({ theme })
  },
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
}))
