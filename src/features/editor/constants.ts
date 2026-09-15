export const BASE_CELL_SIZE = 36
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 3

/** How far (in grid units) a point snaps to the nearest guideline
 * intersection, expressed as a fraction of one cell. */
export const SNAP_RADIUS_GRID = 0.32

/** How close (in grid units) a point must be to an existing stitch's
 * `pos` to count as "hitting" it, for sweep tools and attachment drags. */
export const STITCH_HIT_RADIUS_GRID = 0.4

/** Touch/pointer hit-test radii, in screen pixels (independent of zoom so
 * targets stay easy to grab at any zoom level). */
export const HANDLE_HIT_RADIUS_PX = 16
export const BODY_HIT_RADIUS_PX = 14
export const MOVE_CANCEL_PX = 8

/** The glyph's own body (legs excluded) must fit within a circle of this
 * radius, expressed as a fraction of one cell. That circle is what gets
 * cleared (filled + outlined) in the background color right before the
 * symbol is drawn on top of it. Glyph nominal size is derived from this
 * (diameter = 2x the radius), not an independent fixed value — see
 * StitchGrid.tsx. */
export const GLYPH_HALO_RADIUS_RATIO = 0.25
