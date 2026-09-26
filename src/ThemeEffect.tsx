import { useEffect } from 'react'
import { useSettingsStore } from './store/settingsStore'

/**
 * Applies the resolved theme (light/dark/system) as a `.dark` class on
 * `<html>`, which the `dark:` variant (see index.css's `@custom-variant
 * dark`) keys off. Renders nothing — this is a side-effect-only
 * component, mounted once near the app root.
 */
export function ThemeEffect() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', dark)
    }

    apply()

    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
  }, [theme])

  return null
}
