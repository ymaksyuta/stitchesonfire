import { describe, expect, it } from 'vitest'
import { placeGlyph, averageAttachmentAngle } from './stitchGlyphs'

describe('placeGlyph', () => {
  it('places a glyph at real pixel scale, not a fraction of a pixel', () => {
    const { shape } = placeGlyph('single', {
      posX: 0,
      posY: 0,
      targetAngle: null,
      nominalSize: 36,
    })
    const line = shape[0]
    // Upright "single": vertical line from (0,-18) to (0,18) at nominal 36px.
    expect(Math.hypot(line[0].x - 0, line[0].y - -18)).toBeLessThan(1)
    expect(Math.hypot(line[1].x - 0, line[1].y - 18)).toBeLessThan(1)
  })

  it('tilts to face a given target angle without changing its size', () => {
    const upright = placeGlyph('single', {
      posX: 0,
      posY: 0,
      targetAngle: null,
      nominalSize: 36,
    })
    const tilted = placeGlyph('single', {
      posX: 0,
      posY: 0,
      targetAngle: 0, // pointing right instead of the default (down)
      nominalSize: 36,
    })
    const uprightLen = Math.hypot(
      upright.shape[0][1].x - upright.shape[0][0].x,
      upright.shape[0][1].y - upright.shape[0][0].y,
    )
    const tiltedLen = Math.hypot(
      tilted.shape[0][1].x - tilted.shape[0][0].x,
      tilted.shape[0][1].y - tilted.shape[0][0].y,
    )
    expect(tiltedLen).toBeCloseTo(uprightLen, 5)
    // Attachment point rotated from pointing down to pointing right.
    expect(tilted.attachmentPoints[0].x).toBeGreaterThan(15)
    expect(Math.abs(tilted.attachmentPoints[0].y)).toBeLessThan(1)
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
