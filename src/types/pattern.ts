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
 * `marker` is a display-only flag (e.g. for a turning chain) — it carries
 * no row-counting or graph semantics yet, nothing is inferred from it.
 */
export interface Stitch {
  id: string
  type: StitchType
  /** Optional accent color (hex). Falls back to the default ink color.
   * Not tied to `side` specifically — usable for any future coloring
   * need too. */
  color?: string
  pos: { x: number; y: number }
  anchors: (Anchor | null)[]
  /** Which thread (yarn strand) this stitch belongs to. */
  thread: string
  /** Which layer's grid this stitch is placed against. */
  layer: string
  /**
   * Display-only marker (e.g. for a turning chain) — currently a plain
   * boolean; intended to eventually reference a marker glyph id instead.
   * Independent of any row/counting logic: it's a visual flag, not a
   * source of truth for anything structural yet. When true, an extra
   * bright badge is drawn over the stitch's glyph.
   */
  marker?: boolean
  /**
   * Overrides the owning thread's default turning-chain loop size
   * (`Thread.turningLoopSize`) for this stitch specifically. Loop size is
   * driven among other things by hook size and can vary across sections
   * of a chart.
   */
  size?: number
  /**
   * Right-side / wrong-side, independent of row grouping. Selects which
   * of the owning thread's four colors (see `Thread.colors`) this stitch
   * draws with. The very first stitch defaults to `'right'`; every
   * stitch after that defaults from the placement direction relative to
   * the previous stitch (the same left/right test the sequence-line
   * coloring uses) — the user can flip it explicitly afterwards.
   */
  side: 'right' | 'wrong'
}

/**
 * The four colors a thread draws with. "Active" means this is the
 * thread of the current stitch (the last-selected stitch) — any other
 * thread present in the pattern is "passive". Independently, each
 * stitch's own `side` picks the right/wrong half of that pair. A
 * stitch's `color` may override the resolved color, but only while its
 * thread is the active one — on a passive thread the thread color always
 * wins.
 */
export interface ThreadColors {
  activeRight: string
  activeWrong: string
  passiveRight: string
  passiveWrong: string
}

/**
 * A yarn strand. Threads and layers are independent axes: a thread owns
 * working-order/sequence concerns, a layer owns grid type and grid-point
 * placement. A pattern can have more than one thread.
 */
export interface Thread {
  id: string
  name?: string
  colors: ThreadColors
  /** Default turning-chain loop size for stitches on this thread, unless
   * a stitch sets `size`. */
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
 * snapping only. Every stitch references one, but the grid is never a
 * source of truth for position — stitch `pos` is always a free {x,y} and
 * is never derived from a layer's grid coordinates.
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
