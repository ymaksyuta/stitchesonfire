import type { Anchor, Stitch } from '../../types/pattern'

/**
 * Resolve a single anchor to the logical (grid-unit, pre-cellSize)
 * position it points at, or null if it can't be resolved (dangling
 * reference, or a kind with no resolvable position yet).
 *
 * This is the one place that knows how to read each anchor kind, so
 * glyph-tilt and leg-drawing code never needs to branch on `anchor.kind`
 * itself.
 */
export function anchorPosition(
  anchor: Anchor,
  stitchesById: Map<string, Stitch>,
): { x: number; y: number } | null {
  switch (anchor.kind) {
    case 'crown':
    case 'post': {
      // Loop side (FLO/BLO) and post side (front/back) affect texture and
      // downstream attachment semantics, not glyph position yet — both
      // resolve to the target stitch's own position for now.
      const target = stitchesById.get(anchor.targetId)
      return target ? { x: target.pos.x, y: target.pos.y } : null
    }
    case 'magicRing':
      // Magic ring is modeled but has no rendered position of its own yet.
      return null
    case 'chainSpace': {
      const points = anchor.chainIds
        .map((id) => stitchesById.get(id))
        .filter((s): s is Stitch => s !== undefined)
      if (points.length === 0) return null
      if (points.length === 1) return { x: points[0].pos.x, y: points[0].pos.y }
      const t = anchor.offset ?? 0.5
      const first = points[0]
      const last = points[points.length - 1]
      return {
        x: first.pos.x + (last.pos.x - first.pos.x) * t,
        y: first.pos.y + (last.pos.y - first.pos.y) * t,
      }
    }
  }
}
