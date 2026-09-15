import { useRef } from 'react'

const LONG_PRESS_MS = 450
const MOVE_CANCEL_PX = 10

/**
 * Returns pointer handlers that call `onLongPress` if the pointer stays
 * down (without much movement) for LONG_PRESS_MS, and `onTap` otherwise
 * (a plain, short press/click). Works uniformly for mouse and touch since
 * it's built on Pointer Events.
 */
export function useLongPress(onLongPress: () => void, onTap?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const firedLongPress = useRef(false)

  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY }
    firedLongPress.current = false
    clear()
    timer.current = setTimeout(() => {
      firedLongPress.current = true
      onLongPress()
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!start.current) return
    const moved = Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > MOVE_CANCEL_PX
    if (moved) clear()
  }

  const onPointerUp = () => {
    clear()
    if (!firedLongPress.current) onTap?.()
    start.current = null
  }

  const onPointerCancel = () => {
    clear()
    start.current = null
  }

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
