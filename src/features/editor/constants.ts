export const BASE_CELL_SIZE = 36
export const MIN_ZOOM = 0.5
export const MAX_ZOOM = 3

/** How far (in grid units) a dropped/dragged point will snap to a guideline
 * intersection or to another node, expressed as a fraction of one cell. */
export const SNAP_RADIUS_GRID = 0.32

/** Touch/pointer hit-test radii, in screen pixels (independent of zoom so
 * targets stay easy to grab at any zoom level). */
export const HANDLE_HIT_RADIUS_PX = 16
export const BODY_HIT_RADIUS_PX = 10
export const MOVE_CANCEL_PX = 8

/** Default offset (in grid units) for a freshly placed stitch's tip,
 * relative to its base — points "up" into the previous row. */
export const DEFAULT_TIP_OFFSET = { dx: 0, dy: -1 }
