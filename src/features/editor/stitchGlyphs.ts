import type { StitchType } from '../../types/pattern'

/**
 * Every glyph is defined in its own local unit space: the base sits at
 * (0, 0), the tip at (0, -1) — "up" in local space always means "toward
 * the tip". A glyph is a list of polylines (each an array of local
 * points); a polyline with `closed: true` is stroked as a closed shape
 * (used for the chain stitch's oval).
 *
 * This local space is deliberately separate from the node graph. Nodes
 * only ever supply two numbers to a glyph: how long its axis should be
 * (base-to-tip distance) and which way it points (base-to-tip angle).
 * Nothing about node positions ever touches a glyph's control points
 * directly, so repeated node edits can't accumulate distortion in the
 * glyph shapes themselves.
 */
interface GlyphPolyline {
  points: { x: number; y: number }[]
  closed?: boolean
}

type Glyph = GlyphPolyline[]

const oval: GlyphPolyline = {
  closed: true,
  points: Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2
    return { x: Math.cos(a) * 0.24, y: -0.5 + Math.sin(a) * 0.34 }
  }),
}

const GLYPHS: Record<StitchType, Glyph> = {
  chain: [oval],
  slipStitch: [oval],
  single: [
    { points: [{ x: 0, y: 0 }, { x: 0, y: -1 }] },
    { points: [{ x: -0.22, y: -0.5 }, { x: 0.22, y: -0.5 }] },
  ],
  double: [
    { points: [{ x: 0, y: 0 }, { x: 0, y: -1 }] },
    { points: [{ x: -0.18, y: -0.62 }, { x: 0.18, y: -0.38 }] },
  ],
}

export interface GlyphPlacement {
  /** Base point in pixels (screen/canvas space). */
  baseX: number
  baseY: number
  /** Base-to-tip length in pixels. */
  length: number
  /** Base-to-tip angle in radians (canvas convention, y down). */
  angle: number
  /** Nominal length (in px) at which the glyph is drawn at 1:1 scale. */
  nominalLength: number
}

const MIN_AXIS_SCALE = 0.35
const MAX_AXIS_SCALE = 4

/**
 * Transform a glyph's local points into absolute canvas coordinates for
 * one placement. Stretching only ever happens along the glyph's own
 * local axes (its length axis here; width stays fixed), scale factors
 * are always positive so the glyph can tilt and elongate but never
 * mirrors/flips. The rotation this produces is a pure rotation, which
 * preserves stroke width — no ctx.scale is used, so callers can stroke
 * the result with one constant lineWidth regardless of how stretched or
 * rotated the glyph is.
 */
export function placeGlyph(
  type: StitchType,
  placement: GlyphPlacement,
): { x: number; y: number }[][] {
  const glyph = GLYPHS[type]
  const rawAxisScale = placement.length / placement.nominalLength
  const axisScale = Math.min(
    MAX_AXIS_SCALE,
    Math.max(MIN_AXIS_SCALE, rawAxisScale),
  )
  const widthScale = 1 // reserved for future width handles; never negative

  const cos = Math.cos(placement.angle + Math.PI / 2)
  const sin = Math.sin(placement.angle + Math.PI / 2)

  return glyph.map((poly) => {
    const pts = poly.points.map((p) => {
      // Scale in local space first (axis = local y, width = local x).
      const lx = p.x * widthScale
      const ly = p.y * axisScale
      // Then rotate into world space and place at the base point.
      // (angle + 90deg because local "up" / -y is the glyph's own axis,
      // while angle 0 in canvas points along +x.)
      const wx = lx * cos - ly * sin
      const wy = lx * sin + ly * cos
      return { x: placement.baseX + wx, y: placement.baseY + wy }
    })
    return poly.closed ? [...pts, pts[0]] : pts
  })
}
