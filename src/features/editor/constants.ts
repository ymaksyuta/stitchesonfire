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

/** Fixed on-screen size (in px, before zoom) every glyph is drawn at —
 * glyphs never stretch, only tilt. */
export const NOMINAL_GLYPH_SIZE = 30
