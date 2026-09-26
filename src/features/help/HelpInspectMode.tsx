import { useEffect } from 'react'
import { useHelpStore } from './helpStore'

/**
 * Renders nothing — while inspect mode is on, it captures every click at
 * the document level (capture phase, before any button's own onClick),
 * blocks the normal action, and opens help for the nearest ancestor
 * carrying a `data-help-id`.
 *
 * Elements marked `data-help-toggle` (the "?" button, the header search
 * bar, the help popups themselves) are exempt — they must keep working
 * normally so the person can exit inspect mode or use the search.
 */
export function HelpInspectMode() {
  const inspectMode = useHelpStore((s) => s.inspectMode)
  const openElementHelp = useHelpStore((s) => s.openElementHelp)
  const exitInspectMode = useHelpStore((s) => s.exitInspectMode)

  useEffect(() => {
    if (!inspectMode) return

    document.body.classList.add('help-inspect-mode')

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('[data-help-toggle]')) return // let these work normally

      e.preventDefault()
      e.stopPropagation()
      const match = target.closest<HTMLElement>('[data-help-id]')
      if (match) openElementHelp(match.dataset.helpId!)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitInspectMode()
    }

    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('help-inspect-mode')
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [inspectMode, openElementHelp, exitInspectMode])

  return null
}
