import { useRef, useEffect, useCallback } from 'react'
import { usePatternStore } from '../../store/patternStore'
import type { StitchCell, StitchType } from '../../types/pattern'

const CELL_SIZE = 36

const STITCH_GLYPH: Record<StitchType, string> = {
  chain: '○',
  single: '+',
  double: '↑',
  slipStitch: '•',
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  rows: number,
  cols: number,
  cells: StitchCell[],
) {
  const width = cols * CELL_SIZE
  const height = rows * CELL_SIZE

  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = '#d4d4d8'
  ctx.lineWidth = 1

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * CELL_SIZE)
    ctx.lineTo(width, r * CELL_SIZE)
    ctx.stroke()
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath()
    ctx.moveTo(c * CELL_SIZE, 0)
    ctx.lineTo(c * CELL_SIZE, height)
    ctx.stroke()
  }

  ctx.fillStyle = '#18181b'
  ctx.font = `${CELL_SIZE * 0.55}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  for (const cell of cells) {
    const x = cell.col * CELL_SIZE + CELL_SIZE / 2
    const y = cell.row * CELL_SIZE + CELL_SIZE / 2
    ctx.fillText(STITCH_GLYPH[cell.stitch], x, y)
  }
}

export function StitchGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { pattern, placeStitch, clearCell } = usePatternStore()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = pattern.cols * CELL_SIZE
    const height = pattern.rows * CELL_SIZE
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.scale(dpr, dpr)

    drawGrid(ctx, pattern.rows, pattern.cols, pattern.cells)
  }, [pattern])

  const handlePointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const col = Math.floor(x / CELL_SIZE)
      const row = Math.floor(y / CELL_SIZE)
      if (row < 0 || col < 0 || row >= pattern.rows || col >= pattern.cols)
        return

      const existing = pattern.cells.find(
        (c) => c.row === row && c.col === col,
      )
      if (existing) {
        clearCell(row, col)
      } else {
        placeStitch(row, col)
      }
    },
    [pattern, placeStitch, clearCell],
  )

  return (
    <div className="w-full overflow-auto touch-pan-x touch-pan-y">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointer}
        className="bg-white"
      />
    </div>
  )
}
