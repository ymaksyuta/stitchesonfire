export type StitchType = 'chain' | 'single' | 'double' | 'slipStitch'

/**
 * How many attachment points a stitch type has — i.e. how many other
 * loops it hooks into. All current types hook into exactly one (or zero,
 * for a foundation chain). A decrease type (sc2tog, ...) would be 2+.
 */
export const ATTACHMENT_ARITY: Record<StitchType, number> = {
  chain: 0,
  single: 1,
  double: 1,
  slipStitch: 1,
}

/**
 * A stitch is its own position anchor — there's no separate node entity.
 * `pos` is where the glyph is drawn; it never moves except by an explicit
 * geometric drag (or a deliberate tool action), so repeated edits
 * elsewhere in the chart can't nudge it around as a side effect.
 *
 * `attachments[i]` is the id of the stitch that attachment point `i`
 * hooks into, or null if unattached. Several stitches pointing their
 * attachment at the same target id is how fan-out reads (many stitches,
 * one shared base); a single stitch with several non-null attachments is
 * how a decrease/cluster reads (one stitch, several bases). Both are
 * just entries in this array — no separate data structure for either.
 */
export interface Stitch {
  id: string
  type: StitchType
  /** Optional accent color (hex). Falls back to the default ink color. */
  color?: string
  pos: { x: number; y: number }
  attachments: (string | null)[]
}

export interface Pattern {
  id: string
  name: string
  /** Guideline grid size — informs snapping and canvas extent, not a hard grid. */
  rows: number
  cols: number
  stitches: Stitch[]
  /** Working order of the thread — independent of `attachments`. */
  sequence: string[]
  createdAt: number
  updatedAt: number
}
