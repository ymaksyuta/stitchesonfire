import type { StitchType } from '../../types/pattern'

/**
 * Every glyph is authored once, in its own local unit space centered on
 * (0, 0) — which is exactly the stitch's `pos`. A glyph never stretches:
 * placing it only ever rotates it (tilt) and scales it uniformly by a
 * fixed nominal size. The connecting "legs" to whatever a stitch hooks
 * into are a separate, plain straight line per attachment — drawn
 * outside this module — so the symbol itself never distorts no matter
 * how far or close its target is.
 */
interface GlyphPolyline {
  points: { x: number; y: number }[]
  closed?: boolean
  /** Filled solid in the stitch's own color (e.g. a dot), rather than
   * just stroked as an outline. */
  filled?: boolean
}

export interface GlyphVariant {
  id: string
  labelKey: string
  shape: GlyphPolyline[]
  /** Local coordinates of each attachment "foot", length === arity.
   * Default/neutral direction is straight down, i.e. (0, +0.5). */
  attachmentPoints: { x: number; y: number }[]
}

function ellipsePoints(rx: number, ry: number, segments = 16) {
  return Array.from({ length: segments }, (_, i) => {
    const a = (i / segments) * Math.PI * 2
    return { x: Math.cos(a) * rx, y: Math.sin(a) * ry }
  })
}

const verticalLineWithCrossbar: GlyphPolyline[] = [
  { points: [{ x: 0, y: -0.5 }, { x: 0, y: 0.5 }] },
  { points: [{ x: -0.22, y: 0 }, { x: 0.22, y: 0 }] },
]

/** Every stitch type has one or more variants a person can pick between
 * for a given pattern (`Pattern.glyphVariants`) — e.g. a chain stitch
 * drawn as an ellipse, a rounder circle, or a small filled dot. The
 * first entry in each list is the default. */
export const GLYPH_VARIANTS: Record<StitchType, GlyphVariant[]> = {
  chain: [
    {
      id: 'circle',
      labelKey: 'glyphVariant.circle',
      shape: [{ closed: true, points: ellipsePoints(0.28, 0.28) }],
      attachmentPoints: [],
    },
    {
      id: 'dot',
      labelKey: 'glyphVariant.dot',
      shape: [{ closed: true, filled: true, points: ellipsePoints(0.12, 0.12, 10) }],
      attachmentPoints: [],
    },
  ],
  slipStitch: [
    {
      id: 'dot',
      labelKey: 'glyphVariant.dot',
      shape: [{ closed: true, filled: true, points: ellipsePoints(0.12, 0.12, 10) }],
      attachmentPoints: [{ x: 0, y: 0.5 }],
    },
  ],
  single: [
    {
      id: 'cross',
      labelKey: 'glyphVariant.cross',
      shape: verticalLineWithCrossbar,
      attachmentPoints: [{ x: 0, y: 0.5 }],
    },
  ],
  // Same body as "single" — a double crochet's yarn-over is marked on its
  // *leg* (as diagonal tick marks, see YARN_OVERS below), not by giving
  // the symbol itself a different shape.
  double: [
    {
      id: 'cross',
      labelKey: 'glyphVariant.cross',
      shape: verticalLineWithCrossbar,
      attachmentPoints: [{ x: 0, y: 0.5 }],
    },
  ],
}

/** How many diagonal tick marks cross a stitch's leg — the standard
 * crochet-chart way of marking yarn-overs (0 ticks = single crochet's
 * leg is plain, 1 tick = double crochet, a future treble would be 2). */
export const YARN_OVERS: Record<StitchType, number> = {
  chain: 0,
  slipStitch: 0,
  single: 0,
  double: 1,
}

/** Row-shift amount per stitch type (e.g. a post-stitch row nudging the
 * next row relative to the previous one), analogous to YARN_OVERS above.
 * Reference/informational only for now — no rendering or layout logic
 * reads this yet; every type defaults to 0 until a shifting type exists. */
export const STITCH_SHIFT: Record<StitchType, number> = {
  chain: 0,
  slipStitch: 0,
  single: 0,
  double: 0,
}

function rotate(p: { x: number; y: number }, rotation: number) {
  const cos = Math.cos(rotation)
  const sin = Math.sin(rotation)
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos }
}

/** The local default ("neutral") direction every glyph's attachments
 * point in before any tilt is applied: straight down. */
const DEFAULT_ANGLE = Math.PI / 2

export interface GlyphPlacement {
  posX: number
  posY: number
  /** World-space angle the glyph's attachment side should point toward
   * (radians, canvas convention). `null` keeps the glyph upright. */
  targetAngle: number | null
  nominalSize: number
}

export function resolveVariant(type: StitchType, variantId: string | undefined): GlyphVariant {
  const variants = GLYPH_VARIANTS[type]
  return variants.find((v) => v.id === variantId) ?? variants[0]
}

export function placeGlyph(type: StitchType, variantId: string | undefined, placement: GlyphPlacement) {
  const def = resolveVariant(type, variantId)
  const rotation =
    placement.targetAngle === null ? 0 : placement.targetAngle - DEFAULT_ANGLE

  const toWorld = (p: { x: number; y: number }) => {
    const scaled = { x: p.x * placement.nominalSize, y: p.y * placement.nominalSize }
    const rotated = rotate(scaled, rotation)
    return { x: placement.posX + rotated.x, y: placement.posY + rotated.y }
  }

  const shape = def.shape.map((poly) => ({
    points: poly.points.map(toWorld),
    closed: poly.closed ?? false,
    filled: poly.filled ?? false,
  }))
  const attachmentPoints = def.attachmentPoints.map(toWorld)

  return { shape, attachmentPoints }
}

/**
 * Average the direction vectors from a stitch to each of its attachment
 * targets (not the angles themselves — averaging angles directly breaks
 * down near the +/-180 degree wrap, e.g. -170 and +170 would average to
 * 0 despite both pointing almost the same way).
 */
export function averageAttachmentAngle(
  fromX: number,
  fromY: number,
  targets: { x: number; y: number }[],
): number | null {
  if (targets.length === 0) return null
  let sumX = 0
  let sumY = 0
  for (const t of targets) {
    sumX += t.x - fromX
    sumY += t.y - fromY
  }
  if (sumX === 0 && sumY === 0) return null
  return Math.atan2(sumY / targets.length, sumX / targets.length)
}
