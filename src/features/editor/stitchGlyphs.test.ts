import { describe, expect, it } from 'vitest'
import { placeGlyph, averageAttachmentAngle, YARN_OVERS, GLYPH_VARIANTS } from './stitchGlyphs'
import { ALL_STITCH_TYPES } from '../../types/pattern'

describe('placeGlyph', () => {
  it('places a glyph at real pixel scale, not a fraction of a pixel', () => {
    const { shape } = placeGlyph('single', undefined, {
      posX: 0,
      posY: 0,
      targetAngle: null,
      nominalSize: 36,
    })
    const line = shape[0].points
    // Upright "single": vertical line from (0,-18) to (0,18) at nominal 36px.
    expect(Math.hypot(line[0].x - 0, line[0].y - -18)).toBeLessThan(1)
    expect(Math.hypot(line[1].x - 0, line[1].y - 18)).toBeLessThan(1)
  })

  it('tilts to face a given target angle without changing its size', () => {
    const upright = placeGlyph('single', undefined, {
      posX: 0,
      posY: 0,
      targetAngle: null,
      nominalSize: 36,
    })
    const tilted = placeGlyph('single', undefined, {
      posX: 0,
      posY: 0,
      targetAngle: 0, // pointing right instead of the default (down)
      nominalSize: 36,
    })
    const uprightLen = Math.hypot(
      upright.shape[0].points[1].x - upright.shape[0].points[0].x,
      upright.shape[0].points[1].y - upright.shape[0].points[0].y,
    )
    const tiltedLen = Math.hypot(
      tilted.shape[0].points[1].x - tilted.shape[0].points[0].x,
      tilted.shape[0].points[1].y - tilted.shape[0].points[0].y,
    )
    expect(tiltedLen).toBeCloseTo(uprightLen, 5)
    // Attachment point rotated from pointing down to pointing right.
    expect(tilted.attachmentPoints[0].x).toBeGreaterThan(15)
    expect(Math.abs(tilted.attachmentPoints[0].y)).toBeLessThan(1)
  })

  it('double crochet has the same body as single crochet — the yarn-over is marked on the leg, not the symbol', () => {
    const single = placeGlyph('single', undefined, { posX: 0, posY: 0, targetAngle: null, nominalSize: 36 })
    const double = placeGlyph('double', undefined, { posX: 0, posY: 0, targetAngle: null, nominalSize: 36 })
    expect(double.shape).toEqual(single.shape)
    expect(YARN_OVERS.single).toBe(0)
    expect(YARN_OVERS.double).toBe(1)
  })

  it('every glyph variant fits within the halo circle (local radius 0.5)', () => {
    for (const type of ALL_STITCH_TYPES) {
      for (const variant of GLYPH_VARIANTS[type]) {
        for (const poly of variant.shape) {
          for (const p of poly.points) {
            const r = Math.hypot(p.x, p.y)
            expect(r, `${type}/${variant.id}`).toBeLessThanOrEqual(0.5)
          }
        }
      }
    }
  })
})

describe('averageAttachmentAngle', () => {
  it('returns null with no targets', () => {
    expect(averageAttachmentAngle(0, 0, [])).toBeNull()
  })

  it('averages direction vectors, not raw angles (handles the +/-180 wrap)', () => {
    // One target almost due "left-up", one almost due "left-down" —
    // both roughly pointing left (angle ~180deg), which naive angle
    // averaging would collapse toward 0deg (pointing right).
    const angle = averageAttachmentAngle(0, 0, [
      { x: -10, y: -1 },
      { x: -10, y: 1 },
    ])
    expect(angle).not.toBeNull()
    expect(Math.abs(angle! - Math.PI)).toBeLessThan(0.2)
  })
})
