import { create } from 'zustand'
import type { Pattern, StitchCell, StitchType } from '../types/pattern'

function emptyPattern(rows: number, cols: number): Pattern {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: 'Untitled pattern',
    rows,
    cols,
    cells: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** Does (row,col) fall inside the footprint of cell `c`? */
function cellCovers(c: StitchCell, row: number, col: number): boolean {
  const rowSpan = c.rowSpan ?? 1
  const colSpan = c.colSpan ?? 1
  return (
    row >= c.row &&
    row < c.row + rowSpan &&
    col >= c.col &&
    col < c.col + colSpan
  )
}

interface PatternState {
  pattern: Pattern
  activeStitch: StitchType
  activeColor: string | undefined
  zoom: number
  setActiveStitch: (stitch: StitchType) => void
  setActiveColor: (color: string | undefined) => void
  setZoom: (zoom: number) => void
  placeStitch: (row: number, col: number) => void
  clearCell: (row: number, col: number) => void
  stretchCell: (
    origin: { row: number; col: number },
    rowSpan: number,
    colSpan: number,
  ) => void
  reset: (rows?: number, cols?: number) => void
  resizePattern: (rows: number, cols: number) => void
  loadPattern: (pattern: Pattern) => void
}

export const usePatternStore = create<PatternState>((set) => ({
  pattern: emptyPattern(10, 10),
  activeStitch: 'chain',
  activeColor: undefined,
  zoom: 1,
  setActiveStitch: (stitch) => set({ activeStitch: stitch }),
  setActiveColor: (color) => set({ activeColor: color }),
  setZoom: (zoom) => set({ zoom: Math.min(3, Math.max(0.5, zoom)) }),
  placeStitch: (row, col) =>
    set((state) => {
      // Remove anything (including multi-cell stitches) whose footprint
      // includes this cell, then place a fresh 1x1 stitch here.
      const cells: StitchCell[] = state.pattern.cells.filter(
        (c) => !cellCovers(c, row, col),
      )
      cells.push({
        row,
        col,
        stitch: state.activeStitch,
        color: state.activeColor,
      })
      return {
        pattern: { ...state.pattern, cells, updatedAt: Date.now() },
      }
    }),
  clearCell: (row, col) =>
    set((state) => ({
      pattern: {
        ...state.pattern,
        cells: state.pattern.cells.filter((c) => !cellCovers(c, row, col)),
        updatedAt: Date.now(),
      },
    })),
  stretchCell: (origin, rowSpan, colSpan) =>
    set((state) => {
      const target = state.pattern.cells.find(
        (c) => c.row === origin.row && c.col === origin.col,
      )
      if (!target) return state

      const clampedRowSpan = Math.max(
        1,
        Math.min(rowSpan, state.pattern.rows - target.row),
      )
      const clampedColSpan = Math.max(
        1,
        Math.min(colSpan, state.pattern.cols - target.col),
      )

      const grown: StitchCell = {
        ...target,
        rowSpan: clampedRowSpan,
        colSpan: clampedColSpan,
      }
      // Clear any other stitches the new, larger footprint would overlap.
      const cells = state.pattern.cells
        .filter((c) => c === target || !cellCovers(grown, c.row, c.col))
        .map((c) => (c === target ? grown : c))

      return {
        pattern: { ...state.pattern, cells, updatedAt: Date.now() },
      }
    }),
  reset: (rows = 10, cols = 10) => set({ pattern: emptyPattern(rows, cols) }),
  resizePattern: (rows, cols) =>
    set((state) => {
      const safeRows = Math.max(1, Math.min(200, rows))
      const safeCols = Math.max(1, Math.min(200, cols))
      // Keep stitches that still fully fit inside the new bounds; drop the
      // rest rather than truncate them, so nothing renders half-cut-off.
      const cells = state.pattern.cells.filter(
        (c) =>
          c.row + (c.rowSpan ?? 1) <= safeRows &&
          c.col + (c.colSpan ?? 1) <= safeCols,
      )
      return {
        pattern: {
          ...state.pattern,
          rows: safeRows,
          cols: safeCols,
          cells,
          updatedAt: Date.now(),
        },
      }
    }),
  loadPattern: (pattern) => set({ pattern, zoom: 1 }),
}))
