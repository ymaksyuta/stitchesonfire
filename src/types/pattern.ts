export type StitchType = 'chain' | 'single' | 'double' | 'slipStitch'

/**
 * A connection point in the chart. Coordinates are in grid units (same
 * scale as `Pattern.rows`/`Pattern.cols`), so they line up with the
 * guideline grid but can hold any fractional position — nodes are not
 * confined to grid intersections.
 *
 * A node may be referenced by more than one stitch's `baseNodeId` or
 * `tipNodeId` at once (a shared node). That's what represents fan-outs
 * (many stitches sharing one base) and clusters (many stitches sharing
 * one tip) — no separate data structure needed for those.
 */
export interface StitchNode {
  id: string
  x: number
  y: number
}

/**
 * A single stitch, drawn as a line/glyph from its base node to its tip
 * node. Length and angle are derived from the two nodes' positions, not
 * stored — moving either node reshapes the stitch automatically.
 */
export interface Stitch {
  id: string
  type: StitchType
  /** Optional accent color (hex). Falls back to the default ink color. */
  color?: string
  baseNodeId: string
  tipNodeId: string
}

export interface Pattern {
  id: string
  name: string
  /** Guideline grid size — informs snapping and canvas extent, not a hard grid. */
  rows: number
  cols: number
  nodes: StitchNode[]
  stitches: Stitch[]
  createdAt: number
  updatedAt: number
}
