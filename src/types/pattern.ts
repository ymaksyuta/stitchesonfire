export type StitchType = 'chain' | 'single' | 'double' | 'slipStitch'

export const ALL_STITCH_TYPES: StitchType[] = ['chain', 'single', 'double', 'slipStitch']

// --- Anchors -----------------------------------------------------------
//
// A stitch base attaches to one of several kinds of physical structure,
// not just "another stitch by id". Anchors are polymorphic so the target
// kind is explicit at the type level instead of being inferred from
// context. `null` in a stitch's `anchors` array means that slot is
// currently unattached.

/** Which loop(s) of the target stitch's crown this anchor hooks into. */
export type CrownLoop = 'both' | 'flo' | 'blo'

/** Relief-stitch attachment to a stitch's post rather than its crown. */
export type PostSide = 'front' | 'back'

export interface CrownAnchor {
  kind: 'crown'
  targetId: string
  loop: CrownLoop
}

export interface PostAnchor {
  kind: 'post'
  targetId: string
  side: PostSide
}

export interface MagicRingAnchor {
  kind: 'magicRing'
  ringId: string
}

export interface ChainSpaceAnchor {
  kind: 'chainSpace'
  /** Underlying chain stitch ids spanning the space, in order. */
  chainIds: string[]
  /** Relative position along the span, 0–1. Omitted = unspecified. */
  offset?: number
}

export type Anchor = CrownAnchor | PostAnchor | MagicRingAnchor | ChainSpaceAnchor

/**
 * How many attachment points a stitch type has — i.e. how many anchors it
 * carries. All current types hook into exactly one (or zero, for a
 * foundation chain). A decrease type (sc2tog, ...) would be 2+.
 */
export const ATTACHMENT_ARITY: Record<StitchType, number> = {
  chain: 0,
  single: 1,
  double: 1,
  slipStitch: 1,
}

/**
 * A stitch is its own position anchor — there's no separate node entity.
 * `pos` is where the glyph is drawn and is always a free {x,y}; a layer's
 * grid (see `Layer`) only supplies optional guideline points for snapping,
 * it is never the source of truth for position. `pos` never moves except
 * by an explicit geometric drag or a deliberate tool action.
 *
 * `anchors[i]` is what attachment point `i` hooks into (see `Anchor`), or
 * null if unattached. Several stitches anchoring at the same target is how
 * fan-out reads (many stitches, one shared base); a single stitch with
 * several non-null anchors is how a decrease/cluster reads (one stitch,
 * several bases). Both are just entries in this array.
 *
 * Row/turning-chain semantics are fully explicit for now — nothing is
 * inferred from the graph's shape or from `sequence`. `role`,
 * `directionChange`, and `countsAsStitch` are set directly, by the user or
 * by explicit tool logic.
 */
export interface Stitch {
  id: string
  type: StitchType
  /** Optional accent color (hex). Falls back to the default ink color. */
  color?: string
  pos: { x: number; y: number }
  anchors: (Anchor | null)[]
  /** Which thread (yarn strand) this stitch belongs to. */
  threadId: string
  /** Which layer's grid this stitch is placed against, if any. */
  layerId?: string
  /** Explicit turning-chain role. Only 'turning' is defined for now. */
  role?: 'turning'
  /** Explicit marker that this stitch begins a new row/working direction. */
  directionChange?: boolean
  /**
   * Only meaningful when `role === 'turning'`. `true`: this turning chain
   * substitutes for the first working stitch of the row — the next row's
   * first working stitch enters the second base stitch, and its final
   * stitch anchors into this turning chain's top chain. `false`: purely
   * technical — the first working stitch enters the first base stitch and
   * subsequent rows ignore this turning chain.
   */
  countsAsStitch?: boolean
  /**
   * Overrides the owning thread's default turning-chain loop size
   * (`Thread.turningLoopSize`) for this stitch specifically. Loop size is
   * driven among other things by hook size and can vary across sections
   * of a chart.
   */
  loopSizeOverride?: number
  /** Row-shift offset (e.g. a post-stitch row nudging the next row relative
   * to the previous one). Reserved for future stitch types. */
  shift?: number
}

/**
 * A yarn strand. Threads and layers are independent axes: a thread owns
 * working-order/sequence concerns, a layer owns grid type and grid-point
 * placement. A pattern can have more than one thread.
 */
export interface Thread {
  id: string
  name?: string
  color?: string
  /** Default turning-chain loop size for stitches on this thread, unless
   * a stitch sets `loopSizeOverride`. */
  turningLoopSize?: number
}

export interface RectangularGrid {
  kind: 'rectangular'
  stepX: number
  stepY: number
}

export interface RadialGrid {
  kind: 'radial'
  /** Default radius step between concentric circles. */
  stepRadius: number
  /** Per-circle (per-row) overrides, keyed by circle index. */
  rows?: Record<number, { radius?: number; stitchCount?: number }>
}

export type GridType = RectangularGrid | RadialGrid

/**
 * A layer supplies a grid (rectangular or radial) for guideline points and
 * snapping only. It is structurally optional — stitch `pos` is always a
 * free {x,y} and is never derived from a layer's grid coordinates.
 */
export interface Layer {
  id: string
  name?: string
  grid: GridType
}

// --- Groups (three-tier hierarchy) --------------------------------------
//
// Groups are stored as a separate entity referencing member stitch ids —
// not as a `groupId` field on the stitch. Level 1 is the implicit "no
// group" case (bare stitches). Level 2 groups cannot contain other groups.
// Level 3 (repeats/radial sectors) uses instancing: one template plus N
// virtual instances with a transform; editing the template propagates to
// instances. An instance can be materialized into independent real
// stitches — for now that loses the link back to the template (no
// re-sync afterwards), so materializing simply produces ordinary stitches
// with no group record referencing a template.

export interface ChainArcGroup {
  id: string
  level: 2
  kind: 'chainArc'
  /** Chain stitch ids collapsed into this arc, in order. */
  memberIds: string[]
}

export interface CompositeMotifGroup {
  id: string
  level: 2
  kind: 'compositeMotif'
  memberIds: string[]
  /** Open-ended: 'picot' | 'puff' | 'cluster' | 'shell' | 'fan' | ... */
  motif?: string
}

export type Level2Group = ChainArcGroup | CompositeMotifGroup

export interface RepeatInstance {
  id: string
  transform: { dx: number; dy: number; rotation?: number; scale?: number }
}

export interface RepeatGroup {
  id: string
  level: 3
  kind: 'repeat' | 'radialSector'
  /** The Level 1/Level 2 members (stitch ids and/or Level 2 group ids)
   * that make up the template being repeated. */
  templateMemberIds: string[]
  instances: RepeatInstance[]
}

export type Group = Level2Group | RepeatGroup

export interface Pattern {
  id: string
  name: string
  /** Guideline grid size — informs snapping and canvas extent, not a hard grid. */
  rows: number
  cols: number
  stitches: Stitch[]
  threads: Thread[]
  layers: Layer[]
  groups: Group[]
  /**
   * Working order of the thread — independent of `anchors`. Manual-only
   * for now; auto-rebuild from drawn stitches is deferred.
   */
  sequence: string[]
  /** Which glyph design (see GLYPH_VARIANTS in stitchGlyphs.ts) is used
   * for each stitch type in this pattern — e.g. chain stitch drawn as an
   * ellipse, a circle, or a dot. Missing entries fall back to the first
   * (default) variant for that type. */
  glyphVariants?: Partial<Record<StitchType, string>>
  createdAt: number
  updatedAt: number
}
