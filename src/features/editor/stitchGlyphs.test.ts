import { describe, expect, it } from 'vitest'
import { placeGlyph } from './stitchGlyphs'

describe('placeGlyph', () => {
  it('places a glyph at real pixel scale, not a fraction of a pixel', () => {
    const polylines = placeGlyph('single', {
      baseX: 0,
      baseY: 0,
      length: 36,
      angle: -Math.PI / 2, // pointing straight up (canvas convention)
      nominalLength: 36,
    })
    // "single" is a vertical line + a crossbar; the line's far point should
    // land near (0, -36) — one full nominal length up from the base.
    const line = polylines[0]
    const tip = line[line.length - 1]
    expect(Math.hypot(tip.x - 0, tip.y - -36)).toBeLessThan(1)
  })

  it('stretches along the glyph axis when the stitch is longer than nominal', () => {
    const polylines = placeGlyph('single', {
      baseX: 0,
      baseY: 0,
      length: 72, // 2x nominal
      angle: -Math.PI / 2,
      nominalLength: 36,
    })
    const line = polylines[0]
    const tip = line[line.length - 1]
    expect(Math.hypot(tip.x - 0, tip.y - -72)).toBeLessThan(1)
  })
})
