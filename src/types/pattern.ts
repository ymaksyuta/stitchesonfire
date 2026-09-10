export type StitchType = 'chain' | 'single' | 'double' | 'slipStitch'

export interface StitchCell {
  row: number
  col: number
  stitch: StitchType
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
