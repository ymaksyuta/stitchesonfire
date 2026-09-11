import { useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { usePatternStore } from '../../store/patternStore'
import type { StitchCell, StitchType } from '../../types/pattern'

const BASE_CELL_SIZE = 36
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const LONG_PRESS_MS = 450
const DOUBLE_TAP_MS = 350
const MOVE_CANCEL_PX = 8

const STITCH_GLYPH: Record<StitchType, string> = {
  chain: '○',
  single: '+',
  double: '↑',
  slipStitch: '•',
}

const DEFAULT_INK = '#18181b'

function drawGrid(
  ctx: CanvasRenderingContext2D,
  rows: number,
  cols: number,
  cells: StitchCell[],
  cellSize: number,
) {
  const width = cols * cellSize
  const height = rows * cellSize

  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = '#d4d4d8'
  ctx.lineWidth = 1

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * cellSize)
    ctx.lineTo(width, r * cellSize)
    ctx.stroke()
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath()
    ctx.moveTo(c * cellSize, 0)
    ctx.lineTo(c * cellSize, height)
    ctx.stroke()
  }

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const cell of cells) {
    const rowSpan = cell.rowSpan ?? 1
    const colSpan = cell.colSpan ?? 1
    const boxW = colSpan * cellSize
    const boxH = rowSpan * cellSize
    const x = cell.col * cellSize + boxW / 2
    const y = cell.row * cellSize + boxH / 2

    if (rowSpan > 1 || colSpan > 1) {
      ctx.save()
      ctx.strokeStyle = cell.color ?? DEFAULT_INK
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 1.5
      ctx.strokeRect(
        cell.col * cellSize + 2,
        cell.row * cellSize + 2,
        boxW - 4,
        boxH - 4,
      )
      ctx.restore()
    }

    ctx.fillStyle = cell.color ?? DEFAULT_INK
    ctx.font = `${Math.min(boxW, boxH) * 0.5}px sans-serif`
    ctx.fillText(STITCH_GLYPH[cell.stitch], x, y)
  }
}

export function StitchGrid() {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    pattern,
    zoom,
    setZoom,
    placeStitch,
    clearCell,
    stretchCell,
  } = usePatternStore()

  const cellSize = BASE_CELL_SIZE * zoom

  // --- gesture bookkeeping (kept in refs so it never triggers re-renders) ---
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(
    null,
  )
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressRef = useRef<{
    row: number
    col: number
    x: number
    y: number
    moved: boolean
  } | null>(null)
  const stretchRef = useRef<{
    row: number
    col: number
    x: number
    y: number
    baseRowSpan: number
    baseColSpan: number
  } | null>(null)
  const lastTapRef = useRef<{ row: number; col: number; time: number } | null>(
    null,
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = pattern.cols * cellSize
    const height = pattern.rows * cellSize
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    drawGrid(ctx, pattern.rows, pattern.cols, pattern.cells, cellSize)
  }, [pattern, cellSize])

  const cellAt = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = clientX - rect.left
      const y = clientY - rect.top
      const col = Math.floor(x / cellSize)
      const row = Math.floor(y / cellSize)
      if (row < 0 || col < 0 || row >= pattern.rows || col >= pattern.cols)
        return null
      return { row, col }
    },
    [cellSize, pattern.rows, pattern.cols],
  )

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const beginStretch = useCallback(
    (row: number, col: number, x: number, y: number) => {
      const existing = pattern.cells.find(
        (c) => c.row === row && c.col === col,
      )
      if (!existing) return false
      stretchRef.current = {
        row,
        col,
        x,
        y,
        baseRowSpan: existing.rowSpan ?? 1,
        baseColSpan: existing.colSpan ?? 1,
      }
      return true
    },
    [pattern.cells],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 2) {
        // Entering pinch — cancel any single-finger gesture in flight.
        clearLongPress()
        pressRef.current = null
        stretchRef.current = null
        const pts = Array.from(pointers.current.values())
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        pinchRef.current = { startDist: dist, startZoom: zoom }
        return
      }
      if (pointers.current.size > 2) return

      const cell = cellAt(e.clientX, e.clientY)
      if (!cell) return

      pressRef.current = { ...cell, x: e.clientX, y: e.clientY, moved: false }

      const lastTap = lastTapRef.current
      const now = performance.now()
      if (
        lastTap &&
        lastTap.row === cell.row &&
        lastTap.col === cell.col &&
        now - lastTap.time < DOUBLE_TAP_MS
      ) {
        lastTapRef.current = null
        beginStretch(cell.row, cell.col, e.clientX, e.clientY)
        return
      }

      longPressTimer.current = setTimeout(() => {
        const p = pressRef.current
        if (p && !p.moved) {
          beginStretch(p.row, p.col, p.x, p.y)
        }
      }, LONG_PRESS_MS)
    },
    [beginStretch, cellAt, zoom],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 2 && pinchRef.current) {
        const pts = Array.from(pointers.current.values())
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        const { startDist, startZoom } = pinchRef.current
        if (startDist > 0) {
          const next = startZoom * (dist / startDist)
          setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)))
        }
        return
      }

      if (stretchRef.current) {
        const s = stretchRef.current
        const deltaCols = Math.round((e.clientX - s.x) / cellSize)
        const deltaRows = Math.round((e.clientY - s.y) / cellSize)
        stretchCell(
          { row: s.row, col: s.col },
          s.baseRowSpan + deltaRows,
          s.baseColSpan + deltaCols,
        )
        return
      }

      if (pressRef.current) {
        const dx = e.clientX - pressRef.current.x
        const dy = e.clientY - pressRef.current.y
        if (Math.hypot(dx, dy) > MOVE_CANCEL_PX) {
          pressRef.current.moved = true
          clearLongPress()
        }
      }
    },
    [cellSize, setZoom, stretchCell],
  )

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointers.current.delete(e.pointerId)

      if (pointers.current.size < 2) {
        pinchRef.current = null
      }
      if (pointers.current.size > 0) return

      clearLongPress()

      if (stretchRef.current) {
        stretchRef.current = null
        pressRef.current = null
        return
      }

      const p = pressRef.current
      pressRef.current = null
      if (!p || p.moved) return

      lastTapRef.current = { row: p.row, col: p.col, time: performance.now() }

      const existing = pattern.cells.find(
        (c) => c.row === p.row && c.col === p.col,
      )
      if (existing) {
        clearCell(p.row, p.col)
      } else {
        placeStitch(p.row, p.col)
      }
    },
    [pattern.cells, placeStitch, clearCell],
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom(zoom - e.deltaY * 0.01)
    },
    [setZoom, zoom],
  )

  return (
    <div className="relative w-full overflow-auto touch-pan-x touch-pan-y">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onWheel={handleWheel}
        className="touch-none bg-white"
      />
      <div className="sticky bottom-2 left-2 mt-2 flex w-fit gap-1 rounded-lg border border-zinc-200 bg-white/90 p-1 shadow-sm backdrop-blur">
        <button
          type="button"
          onClick={() => setZoom(zoom - 0.25)}
          aria-label={t('editor.zoomOut')}
          className="h-8 w-8 rounded-md text-zinc-700 hover:bg-zinc-100"
        >
          −
        </button>
        <span className="flex w-12 items-center justify-center text-xs text-zinc-500">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setZoom(zoom + 0.25)}
          aria-label={t('editor.zoomIn')}
          className="h-8 w-8 rounded-md text-zinc-700 hover:bg-zinc-100"
        >
          +
        </button>
      </div>
    </div>
  )
}
