export type StitchType = 'chain' | 'single' | 'double' | 'slipStitch'

export interface StitchCell {
  row: number
  col: number
  stitch: StitchType
  /** Optional accent color (hex). Falls back to the default ink color. */
  color?: string
  /** How many grid cells this stitch stretches over, default 1x1. */
  rowSpan?: number
  colSpan?: number
}

export interface Pattern {
  id: string
  name: string
  rows: number
  cols: number
  cells: StitchCell[]
  createdAt: number
  updatedAt: number
}
