import { useEffect } from 'react'
import { useHelpStore } from './helpStore'

/**
 * Renders nothing — while inspect mode is on, it captures interaction at
 * the document level, before it reaches any button's own handlers, and
 * turns it into "open help for the nearest data-help-id" instead of
 * letting the normal action run.
 *
 * Two event types are intercepted, not just `click`: several controls
 * (thread/layer settings, etc.) open via a press-and-hold timer started
 * on `pointerdown`, which fires — and can already open a popup — before
 * `click` ever exists. Blocking `pointerdown` too stops that at the
 * source; `click` is still blocked as a second line of defence, since
 * on desktop input `preventDefault()` on `pointerdown` doesn't reliably
 * suppress the follow-up `click`.
 *
 * Elements marked `data-help-toggle` (the "?" button, the header search
 * bar, the help popups themselves) are exempt — they must keep working
 * normally so the person can exit inspect mode or use the search.
 *
 * Deliberately does NOT touch anything else's open/closed state: a
 * popup that was already open when "?" was pressed stays open for the
 * whole inspect-mode session (its own close button is just another
 * intercepted click) and is exactly as the person left it once they
 * exit — inspect mode is a transparent overlay on top of whatever the
 * interface already looked like, never a reset of it.
 */
export function HelpInspectMode() {
  const inspectMode = useHelpStore((s) => s.inspectMode)
  const openElementHelp = useHelpStore((s) => s.openElementHelp)
  const exitInspectMode = useHelpStore((s) => s.exitInspectMode)

  useEffect(() => {
    if (!inspectMode) return

    document.body.classList.add('help-inspect-mode')

    const intercept = (e: Event) => {
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

    // capture phase, ahead of every component's own listeners
    document.addEventListener('pointerdown', intercept, true)
    document.addEventListener('click', intercept, true)
    document.addEventListener('contextmenu', intercept, true)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.classList.remove('help-inspect-mode')
      document.removeEventListener('pointerdown', intercept, true)
      document.removeEventListener('click', intercept, true)
      document.removeEventListener('contextmenu', intercept, true)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [inspectMode, openElementHelp, exitInspectMode])

  return null
}
