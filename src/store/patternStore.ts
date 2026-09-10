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

interface PatternState {
  pattern: Pattern
  activeStitch: StitchType
  setActiveStitch: (stitch: StitchType) => void
  placeStitch: (row: number, col: number) => void
  clearCell: (row: number, col: number) => void
  reset: (rows?: number, cols?: number) => void
  loadPattern: (pattern: Pattern) => void
}

export const usePatternStore = create<PatternState>((set) => ({
  pattern: emptyPattern(10, 10),
  activeStitch: 'chain',
  setActiveStitch: (stitch) => set({ activeStitch: stitch }),
  placeStitch: (row, col) =>
    set((state) => {
      const cells: StitchCell[] = state.pattern.cells.filter(
        (c) => !(c.row === row && c.col === col),
      )
      cells.push({ row, col, stitch: state.activeStitch })
      return {
        pattern: { ...state.pattern, cells, updatedAt: Date.now() },
      }
    }),
  clearCell: (row, col) =>
    set((state) => ({
      pattern: {
        ...state.pattern,
        cells: state.pattern.cells.filter(
          (c) => !(c.row === row && c.col === col),
        ),
        updatedAt: Date.now(),
      },
    })),
  reset: (rows = 10, cols = 10) => set({ pattern: emptyPattern(rows, cols) }),
  loadPattern: (pattern) => set({ pattern }),
}))
