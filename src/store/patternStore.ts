import { create } from 'zustand'
import type { Anchor, Layer, Pattern, Stitch, StitchType, Thread } from '../types/pattern'
import { ATTACHMENT_ARITY, ALL_STITCH_TYPES } from '../types/pattern'
import {
  BASE_CELL_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  SNAP_RADIUS_GRID,
  STITCH_HIT_RADIUS_GRID,
} from '../features/editor/constants'

export type Tool = 'add' | 'select' | 'delete' | 'move' | null

const DEFAULT_THREAD_ID = 'default'
const DEFAULT_LAYER_ID = 'default'

/** Fallback color for a thread that doesn't specify its own. */
const DEFAULT_THREAD_COLOR = '#18181b'

function defaultThread(): Thread {
  return { id: DEFAULT_THREAD_ID, color: DEFAULT_THREAD_COLOR }
}

function defaultLayer(): Layer {
  return {
    id: DEFAULT_LAYER_ID,
    grid: { kind: 'rectangular', stepX: 1, stepY: 1 },
    shift: { x: 0, y: 0, angle: 0 },
  }
}

function emptyPattern(rows: number, cols: number): Pattern {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: 'Untitled pattern',
    rows,
    cols,
    stitches: [],
    threads: [defaultThread()],
    layers: [defaultLayer()],
    groups: [],
    sequence: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** Defensive against patterns saved before this rewrite. */
function normalizePattern(p: Pattern): Pattern {
  const threads = Array.isArray(p.threads) && p.threads.length > 0
    ? p.threads.map((t) =>
        typeof t.color === 'string' ? t : { ...t, color: DEFAULT_THREAD_COLOR },
      )
    : [defaultThread()]
  const layers = Array.isArray(p.layers) && p.layers.length > 0
    ? p.layers.map((l) => (l.shift ? l : { ...l, shift: { x: 0, y: 0, angle: 0 } }))
    : [defaultLayer()]
  const fallbackThreadId = threads[0].id
  const fallbackLayerId = layers[0].id
  return {
    ...p,
    stitches: (Array.isArray(p.stitches) ? p.stitches : []).map((s) => ({
      ...s,
      thread: s.thread ?? fallbackThreadId,
      layer: s.layer ?? fallbackLayerId,
      side: s.side ?? 'right',
    })),
    threads,
    layers,
    groups: Array.isArray(p.groups) ? p.groups : [],
    sequence: Array.isArray(p.sequence) ? p.sequence : [],
  }
}

const VISIBLE_TYPES_KEY = 'stitchesonfire:visibleStitchTypes'

function loadVisibleStitchTypes(): StitchType[] {
  try {
    const raw = localStorage.getItem(VISIBLE_TYPES_KEY)
    if (!raw) return ALL_STITCH_TYPES
    const parsed = JSON.parse(raw)
    const valid = parsed.filter((t: unknown) => ALL_STITCH_TYPES.includes(t as StitchType))
    return valid.length > 0 ? valid : ALL_STITCH_TYPES
  } catch {
    return ALL_STITCH_TYPES
  }
}

function saveVisibleStitchTypes(types: StitchType[]) {
  try {
    localStorage.setItem(VISIBLE_TYPES_KEY, JSON.stringify(types))
  } catch {
    // ignore (private browsing, storage disabled, etc.)
  }
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

function snapToGuideline(x: number, y: number) {
  const gx = Math.round(x)
  const gy = Math.round(y)
  return dist(x, y, gx, gy) <= SNAP_RADIUS_GRID ? { x: gx, y: gy } : { x, y }
}

/** The Add tool's sweep is explicitly about guideline intersections —
 * unlike free-form drag placement, it always hard-rounds, never leaves a
 * stitch at a raw fractional position. */
function roundToGrid(x: number, y: number) {
  return { x: Math.round(x), y: Math.round(y) }
}

function findStitchNear(stitches: Stitch[], x: number, y: number, excludeId?: string) {
  let nearest: Stitch | null = null
  let nearestDist = Infinity
  for (const s of stitches) {
    if (s.id === excludeId) continue
    const d = dist(x, y, s.pos.x, s.pos.y)
    if (d < nearestDist) {
      nearestDist = d
      nearest = s
    }
  }
  return nearest && nearestDist <= STITCH_HIT_RADIUS_GRID ? nearest : null
}

function resizeAnchors(anchors: (Anchor | null)[], arity: number) {
  const next = anchors.slice(0, arity)
  while (next.length < arity) next.push(null)
  return next
}

/** Does this anchor reference stitch `id` as one of its targets? Covers
 * both single-target anchors (crown/post) and chain-space anchors, which
 * can reference several chain stitch ids at once. */
function anchorReferences(anchor: Anchor, id: string) {
  if (anchor.kind === 'crown' || anchor.kind === 'post') return anchor.targetId === id
  if (anchor.kind === 'chainSpace') return anchor.chainIds.includes(id)
  return false
}

/** Remove stitch `id` from an anchor's references — nulling a crown/post
 * anchor that pointed at it, or dropping it from a chain-space anchor's
 * chainIds (nulling the anchor entirely if that empties the span). */
function withoutReference(anchor: Anchor, id: string): Anchor | null {
  if (anchor.kind === 'crown' || anchor.kind === 'post') {
    return anchor.targetId === id ? null : anchor
  }
  if (anchor.kind === 'chainSpace') {
    const chainIds = anchor.chainIds.filter((c) => c !== id)
    return chainIds.length > 0 ? { ...anchor, chainIds } : null
  }
  return anchor
}

/** Detach every anchor referencing `id` (used when `id` is deleted, so
 * nothing is left referencing a stitch that no longer exists). */
function detachReferencesTo(stitches: Stitch[], id: string) {
  return stitches.map((s) =>
    s.anchors.some((a) => a !== null && anchorReferences(a, id))
      ? { ...s, anchors: s.anchors.map((a) => (a ? withoutReference(a, id) : a)) }
      : s,
  )
}

interface PaletteDrag {
  type: StitchType
  color: string | undefined
  clientX: number
  clientY: number
}

const HISTORY_LIMIT = 50

interface PatternState {
  pattern: Pattern
  activeStitch: StitchType | null
  visibleStitchTypes: StitchType[]
  activeColor: string | undefined
  // Active side/marker/thread/layer: the values stamped onto newly
  // placed stitches, always live and toggleable regardless of whether
  // anything is selected (mirrors activeColor/activeStitch). When there
  // is a selection, toggling one of these also applies it to the whole
  // selection — see toggleSide/toggleMarker/setThread/setLayer below.
  activeSide: Stitch['side']
  activeMarker: boolean
  activeThread: string
  activeLayer: string
  zoom: number
  showGuides: boolean
  showSequence: boolean
  guideBrightness: number
  sequenceBrightness: number
  showSideContrast: boolean
  sideContrastAmount: number
  selectedStitchIds: string[] // order matters; last = "current"
  activeTool: Tool
  canvasEl: HTMLCanvasElement | null
  dragPreview: PaletteDrag | null
  history: { past: Pattern[]; future: Pattern[] }
  /** Last stitch touched during an active Move-tool sweep; internal to
   * commitMoveSweep, not meant to be read by UI code. */
  lastMoveTarget: string | null
  /** StitchGrid's registered fit-to-content implementation; internal,
   * set via registerFitView, invoked via fitView. */
  fitViewImpl: (() => void) | null

  setActiveStitch: (stitch: StitchType | null) => void
  toggleVisibleStitchType: (type: StitchType) => void
  setActiveColor: (color: string | undefined) => void
  setZoom: (zoom: number) => void
  toggleGuides: () => void
  toggleSequence: () => void
  setGuideBrightness: (value: number) => void
  setSequenceBrightness: (value: number) => void
  toggleSideContrast: () => void
  setSideContrastAmount: (value: number) => void
  setActiveTool: (tool: Tool) => void
  registerCanvas: (el: HTMLCanvasElement | null) => void
  /** StitchGrid registers its own fit-to-content implementation here
   * (it owns the container/canvas refs); the toolbar just calls
   * `fitView()` without knowing how it's done. */
  registerFitView: (fn: (() => void) | null) => void
  fitView: () => void

  beginPaletteDrag: (
    type: StitchType,
    color: string | undefined,
    clientX: number,
    clientY: number,
  ) => void
  updatePaletteDrag: (clientX: number, clientY: number) => void
  endPaletteDrag: () => void
  cancelPaletteDrag: () => void

  selectOnly: (stitchId: string) => void
  toggleSelect: (stitchId: string) => void
  addToSelection: (stitchId: string) => void
  clearSelection: () => void

  // Undo-bracketed gesture lifecycle: call beginGesture() once per
  // pointer-down, then any number of the mutators below.
  beginGesture: () => void
  undo: () => void
  redo: () => void

  setStitchPos: (id: string, x: number, y: number) => void
  finalizeStitchPos: (id: string) => void
  moveStitchesBy: (ids: string[], dx: number, dy: number) => void
  commitAttachmentDrag: (stitchId: string, index: number, x: number, y: number) => void

  // Sweep tool actions — called once per newly-visited grid point.
  applyAddAt: (x: number, y: number) => void
  applySelectAt: (x: number, y: number) => void
  applyDeleteAt: (x: number, y: number) => void
  noteMoveTarget: (x: number, y: number) => void
  commitMoveSweep: () => void

  setPatternName: (name: string) => void
  setGlyphVariant: (type: StitchType, variantId: string) => void
  reset: (rows?: number, cols?: number) => void
  resizePattern: (rows: number, cols: number) => void
  loadPattern: (pattern: Pattern) => void

  // Side/marker/thread/layer editing. Each always updates the
  // corresponding active* default for new stitches, and additionally
  // applies to the current selection when there is one.
  toggleSide: () => void
  toggleMarker: () => void
  setThread: (threadId: string) => void
  setLayer: (layerId: string) => void
  addThread: () => void
  renameThread: (threadId: string, name: string) => void
  setThreadColor: (threadId: string, color: string) => void
  setThreadLoopSize: (threadId: string, size: number | undefined) => void
  addLayer: () => void
  renameLayer: (layerId: string, name: string) => void
  setLayerGridKind: (layerId: string, kind: 'rectangular' | 'radial') => void
  setLayerShift: (layerId: string, axis: 'x' | 'y' | 'angle', value: number) => void
}

export const usePatternStore = create<PatternState>((set, get) => {
  /** Push the pattern onto the undo stack and clear redo — the shared
   * primitive every mutating action funnels through. */
  function pushHistory(pattern: Pattern) {
    set((state) => ({
      history: {
        past: [...state.history.past, pattern].slice(-HISTORY_LIMIT),
        future: [],
      },
    }))
  }

  /** Insert a new stitch after the current selection (or at the start),
   * make it the new sole selection/current. Shared by palette-drop and
   * the Add tool. Does not push history itself — callers do that once
   * per gesture. */
  /** The active thread/layer ids are UI state, independent of whichever
   * pattern happens to be loaded — fall back to the pattern's first
   * thread/layer if the active id doesn't exist in it (e.g. right after
   * loading a different pattern). */
  function resolveThreadId(pattern: Pattern, activeThread: string): string {
    return pattern.threads.some((t) => t.id === activeThread)
      ? activeThread
      : (pattern.threads[0]?.id ?? DEFAULT_THREAD_ID)
  }
  function resolveLayerId(pattern: Pattern, activeLayer: string): string {
    return pattern.layers.some((l) => l.id === activeLayer)
      ? activeLayer
      : (pattern.layers[0]?.id ?? DEFAULT_LAYER_ID)
  }

  function insertStitch(
    pattern: Pattern,
    selectedStitchIds: string[],
    type: StitchType,
    color: string | undefined,
    x: number,
    y: number,
    attachTo: string | null,
    thread: string,
    layer: string,
    side: Stitch['side'],
    marker: boolean,
  ) {
    const arity = ATTACHMENT_ARITY[type]
    const attachAnchor: Anchor | null = attachTo
      ? { kind: 'crown', targetId: attachTo, loop: 'both' }
      : null
    const anchors = resizeAnchors(attachAnchor ? [attachAnchor] : [], arity)
    const currentId = selectedStitchIds[selectedStitchIds.length - 1]
    const stitch: Stitch = {
      id: crypto.randomUUID(),
      type,
      color,
      pos: { x, y },
      anchors,
      thread,
      layer,
      side,
      marker,
    }
    const insertAt = currentId ? pattern.sequence.indexOf(currentId) + 1 : 0
    const sequence = [...pattern.sequence]
    sequence.splice(insertAt, 0, stitch.id)
    return {
      pattern: {
        ...pattern,
        stitches: [...pattern.stitches, stitch],
        sequence,
        updatedAt: Date.now(),
      },
      stitchId: stitch.id,
    }
  }

  return {
    pattern: emptyPattern(10, 10),
    activeStitch: 'chain',
    visibleStitchTypes: loadVisibleStitchTypes(),
    activeColor: undefined,
    activeSide: 'right',
    activeMarker: false,
    activeThread: DEFAULT_THREAD_ID,
    activeLayer: DEFAULT_LAYER_ID,
    zoom: 1,
    showGuides: true,
    showSequence: true,
    guideBrightness: 0.5,
    sequenceBrightness: 0.5,
    showSideContrast: true,
    sideContrastAmount: 0.4,
    selectedStitchIds: [],
    activeTool: null,
    canvasEl: null,
    dragPreview: null,
    history: { past: [], future: [] },
    lastMoveTarget: null,
    fitViewImpl: null,

    setActiveStitch: (stitch) => set({ activeStitch: stitch }),
    toggleVisibleStitchType: (type) =>
      set((state) => {
        const next = state.visibleStitchTypes.includes(type)
          ? state.visibleStitchTypes.filter((t) => t !== type)
          : ALL_STITCH_TYPES.filter(
              (t) => t === type || state.visibleStitchTypes.includes(t),
            )
        if (next.length === 0) return {} // always keep at least one visible
        saveVisibleStitchTypes(next)
        return { visibleStitchTypes: next }
      }),
    setActiveColor: (color) => set({ activeColor: color }),
    setZoom: (zoom) =>
      set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
    toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),
    toggleSequence: () => set((state) => ({ showSequence: !state.showSequence })),
    setGuideBrightness: (value) =>
      set({ guideBrightness: Math.min(1, Math.max(0.05, value)) }),
    setSequenceBrightness: (value) =>
      set({ sequenceBrightness: Math.min(1, Math.max(0.05, value)) }),
    toggleSideContrast: () => set((state) => ({ showSideContrast: !state.showSideContrast })),
    setSideContrastAmount: (value) =>
      set({ sideContrastAmount: Math.min(1, Math.max(0.05, value)) }),
    setActiveTool: (tool) =>
      set((state) => ({ activeTool: state.activeTool === tool ? null : tool })),

    registerCanvas: (el) => set({ canvasEl: el }),
    registerFitView: (fn) => set({ fitViewImpl: fn }),
    fitView: () => get().fitViewImpl?.(),

    beginPaletteDrag: (type, color, clientX, clientY) =>
      set({ dragPreview: { type, color, clientX, clientY } }),

    updatePaletteDrag: (clientX, clientY) =>
      set((state) =>
        state.dragPreview
          ? { dragPreview: { ...state.dragPreview, clientX, clientY } }
          : {},
      ),

    cancelPaletteDrag: () => set({ dragPreview: null }),

    endPaletteDrag: () => {
      const state = get()
      const drag = state.dragPreview
      const canvas = state.canvasEl
      set({ dragPreview: null })
      if (!drag || !canvas) return

      const rect = canvas.getBoundingClientRect()
      const cellSize = BASE_CELL_SIZE * state.zoom
      const px = drag.clientX - rect.left
      const py = drag.clientY - rect.top
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) return // dropped outside — cancel

      const { x, y } = snapToGuideline(px / cellSize, py / cellSize)
      const existing = findStitchNear(state.pattern.stitches, x, y)

      pushHistory(state.pattern)
      if (existing) {
        set((s) => ({
          selectedStitchIds: [existing.id],
          pattern: {
            ...s.pattern,
            stitches: s.pattern.stitches.map((st) =>
              st.id === existing.id ? { ...st, type: drag.type, color: drag.color } : st,
            ),
            updatedAt: Date.now(),
          },
        }))
      } else {
        const { pattern, stitchId } = insertStitch(
          state.pattern,
          state.selectedStitchIds,
          drag.type,
          drag.color,
          x,
          y,
          null,
          resolveThreadId(state.pattern, state.activeThread),
          resolveLayerId(state.pattern, state.activeLayer),
          state.activeSide,
          state.activeMarker,
        )
        set({ pattern, selectedStitchIds: [stitchId] })
      }
    },

    selectOnly: (stitchId) => set({ selectedStitchIds: [stitchId] }),
    toggleSelect: (stitchId) =>
      set((state) => ({
        selectedStitchIds: state.selectedStitchIds.includes(stitchId)
          ? state.selectedStitchIds.filter((id) => id !== stitchId)
          : [...state.selectedStitchIds, stitchId],
      })),
    addToSelection: (stitchId) =>
      set((state) =>
        state.selectedStitchIds.includes(stitchId)
          ? { selectedStitchIds: [...state.selectedStitchIds.filter((id) => id !== stitchId), stitchId] }
          : { selectedStitchIds: [...state.selectedStitchIds, stitchId] },
      ),
    clearSelection: () => set({ selectedStitchIds: [] }),

    beginGesture: () => pushHistory(get().pattern),

    undo: () =>
      set((state) => {
        const prev = state.history.past[state.history.past.length - 1]
        if (!prev) return {}
        return {
          pattern: prev,
          history: {
            past: state.history.past.slice(0, -1),
            future: [...state.history.future, state.pattern],
          },
          selectedStitchIds: [],
        }
      }),

    redo: () =>
      set((state) => {
        const next = state.history.future[state.history.future.length - 1]
        if (!next) return {}
        return {
          pattern: next,
          history: {
            past: [...state.history.past, state.pattern],
            future: state.history.future.slice(0, -1),
          },
          selectedStitchIds: [],
        }
      }),

    // Live position update while dragging a stitch body — no history
    // push here, `beginGesture` already snapshotted at pointer-down.
    setStitchPos: (id, x, y) =>
      set((state) => ({
        pattern: {
          ...state.pattern,
          stitches: state.pattern.stitches.map((s) =>
            s.id === id ? { ...s, pos: { x, y } } : s,
          ),
        },
      })),

    finalizeStitchPos: (id) =>
      set((state) => {
        const s = state.pattern.stitches.find((st) => st.id === id)
        if (!s) return {}
        const snapped = snapToGuideline(s.pos.x, s.pos.y)
        return {
          pattern: {
            ...state.pattern,
            stitches: state.pattern.stitches.map((st) =>
              st.id === id ? { ...st, pos: snapped } : st,
            ),
            updatedAt: Date.now(),
          },
        }
      }),

    moveStitchesBy: (ids, dx, dy) =>
      set((state) => {
        const idSet = new Set(ids)
        return {
          pattern: {
            ...state.pattern,
            stitches: state.pattern.stitches.map((s) =>
              idSet.has(s.id) ? { ...s, pos: { x: s.pos.x + dx, y: s.pos.y + dy } } : s,
            ),
            updatedAt: Date.now(),
          },
        }
      }),

    commitAttachmentDrag: (stitchId, index, x, y) =>
      set((state) => {
        const target = findStitchNear(state.pattern.stitches, x, y, stitchId)
        const anchor: Anchor | null = target
          ? { kind: 'crown', targetId: target.id, loop: 'both' }
          : null
        return {
          pattern: {
            ...state.pattern,
            stitches: state.pattern.stitches.map((s) =>
              s.id === stitchId
                ? { ...s, anchors: s.anchors.map((a, i) => (i === index ? anchor : a)) }
                : s,
            ),
            updatedAt: Date.now(),
          },
        }
      }),

    applyAddAt: (x, y) =>
      set((state) => {
        // The Add tool sweeps guideline intersections specifically — always
        // hard-round, never leave a stitch at a raw fractional position
        // (unlike free-form palette drag-drop, which allows that).
        const snapped = roundToGrid(x, y)
        const existing = findStitchNear(state.pattern.stitches, snapped.x, snapped.y)
        if (existing) {
          return {
            selectedStitchIds: [existing.id],
            pattern: {
              ...state.pattern,
              stitches: state.pattern.stitches.map((s) =>
                s.id === existing.id
                  ? state.activeStitch === null
                    ? { ...s, color: state.activeColor } // no type selected: recolor only
                    : {
                        ...s,
                        type: state.activeStitch,
                        color: state.activeColor,
                        anchors: resizeAnchors(s.anchors, ATTACHMENT_ARITY[state.activeStitch]),
                      }
                  : s,
              ),
              updatedAt: Date.now(),
            },
          }
        }
        if (state.activeStitch === null) return {} // no type selected: never inserts on empty ground
        const { pattern, stitchId } = insertStitch(
          state.pattern,
          state.selectedStitchIds,
          state.activeStitch,
          state.activeColor,
          snapped.x,
          snapped.y,
          null,
          resolveThreadId(state.pattern, state.activeThread),
          resolveLayerId(state.pattern, state.activeLayer),
          state.activeSide,
          state.activeMarker,
        )
        return { pattern, selectedStitchIds: [stitchId] }
      }),

    applySelectAt: (x, y) =>
      set((state) => {
        const hit = findStitchNear(state.pattern.stitches, x, y)
        if (!hit) return {}
        if (state.selectedStitchIds.includes(hit.id)) return {}
        return { selectedStitchIds: [...state.selectedStitchIds, hit.id] }
      }),

    applyDeleteAt: (x, y) =>
      set((state) => {
        const hit = findStitchNear(state.pattern.stitches, x, y)
        if (!hit) return {}
        const stitches = detachReferencesTo(
          state.pattern.stitches.filter((s) => s.id !== hit.id),
          hit.id,
        )
        return {
          selectedStitchIds: state.selectedStitchIds.filter((id) => id !== hit.id),
          pattern: {
            ...state.pattern,
            stitches,
            sequence: state.pattern.sequence.filter((id) => id !== hit.id),
            updatedAt: Date.now(),
          },
        }
      }),

    noteMoveTarget: (x, y) =>
      set((state) => {
        const hit = findStitchNear(state.pattern.stitches, x, y)
        return hit ? { lastMoveTarget: hit.id } : {}
      }),

    commitMoveSweep: () =>
      set((state) => {
        const targetId = state.lastMoveTarget
        if (!targetId || state.selectedStitchIds.includes(targetId)) {
          return { lastMoveTarget: null }
        }
        if (state.selectedStitchIds.length === 0) return { lastMoveTarget: null }
        const moving = new Set(state.selectedStitchIds)
        const rest = state.pattern.sequence.filter((id) => !moving.has(id))
        const targetIndex = rest.indexOf(targetId)
        const ordered = state.pattern.sequence.filter((id) => moving.has(id))
        rest.splice(targetIndex + 1, 0, ...ordered)
        return {
          lastMoveTarget: null,
          pattern: { ...state.pattern, sequence: rest, updatedAt: Date.now() },
        }
      }),

    setPatternName: (name) =>
      set((state) => ({
        pattern: { ...state.pattern, name, updatedAt: Date.now() },
      })),

    setGlyphVariant: (type, variantId) =>
      set((state) => ({
        pattern: {
          ...state.pattern,
          glyphVariants: { ...state.pattern.glyphVariants, [type]: variantId },
          updatedAt: Date.now(),
        },
      })),

    // Each of these always updates the active* default (so it applies to
    // every stitch placed from here on), and additionally applies to the
    // current selection, if there is one, right now.
    toggleSide: () =>
      set((state) => {
        const nextSide: Stitch['side'] = state.activeSide === 'right' ? 'wrong' : 'right'
        const ids = new Set(state.selectedStitchIds)
        return {
          activeSide: nextSide,
          pattern:
            ids.size === 0
              ? state.pattern
              : {
                  ...state.pattern,
                  stitches: state.pattern.stitches.map((s) =>
                    ids.has(s.id) ? { ...s, side: nextSide } : s,
                  ),
                  updatedAt: Date.now(),
                },
        }
      }),

    toggleMarker: () =>
      set((state) => {
        const nextMarker = !state.activeMarker
        const ids = new Set(state.selectedStitchIds)
        return {
          activeMarker: nextMarker,
          pattern:
            ids.size === 0
              ? state.pattern
              : {
                  ...state.pattern,
                  stitches: state.pattern.stitches.map((s) =>
                    ids.has(s.id) ? { ...s, marker: nextMarker } : s,
                  ),
                  updatedAt: Date.now(),
                },
        }
      }),

    setThread: (threadId) =>
      set((state) => {
        const ids = new Set(state.selectedStitchIds)
        return {
          activeThread: threadId,
          pattern:
            ids.size === 0
              ? state.pattern
              : {
                  ...state.pattern,
                  stitches: state.pattern.stitches.map((s) =>
                    ids.has(s.id) ? { ...s, thread: threadId } : s,
                  ),
                  updatedAt: Date.now(),
                },
        }
      }),

    setLayer: (layerId) =>
      set((state) => {
        const ids = new Set(state.selectedStitchIds)
        return {
          activeLayer: layerId,
          pattern:
            ids.size === 0
              ? state.pattern
              : {
                  ...state.pattern,
                  stitches: state.pattern.stitches.map((s) =>
                    ids.has(s.id) ? { ...s, layer: layerId } : s,
                  ),
                  updatedAt: Date.now(),
                },
        }
      }),

    addThread: () =>
      set((state) => {
        const thread: Thread = {
          id: crypto.randomUUID(),
          name: `Thread ${state.pattern.threads.length + 1}`,
          color: DEFAULT_THREAD_COLOR,
        }
        return {
          pattern: {
            ...state.pattern,
            threads: [...state.pattern.threads, thread],
            updatedAt: Date.now(),
          },
        }
      }),

    renameThread: (threadId, name) =>
      set((state) => ({
        pattern: {
          ...state.pattern,
          threads: state.pattern.threads.map((t) => (t.id === threadId ? { ...t, name } : t)),
          updatedAt: Date.now(),
        },
      })),

    setThreadColor: (threadId, color) =>
      set((state) => ({
        pattern: {
          ...state.pattern,
          threads: state.pattern.threads.map((t) =>
            t.id === threadId ? { ...t, color } : t,
          ),
          updatedAt: Date.now(),
        },
      })),

    setThreadLoopSize: (threadId, size) =>
      set((state) => ({
        pattern: {
          ...state.pattern,
          threads: state.pattern.threads.map((t) =>
            t.id === threadId ? { ...t, turningLoopSize: size } : t,
          ),
          updatedAt: Date.now(),
        },
      })),

    addLayer: () =>
      set((state) => {
        const layer: Layer = {
          id: crypto.randomUUID(),
          name: `Layer ${state.pattern.layers.length + 1}`,
          grid: { kind: 'rectangular', stepX: 1, stepY: 1 },
          shift: { x: 0, y: 0, angle: 0 },
        }
        return {
          pattern: {
            ...state.pattern,
            layers: [...state.pattern.layers, layer],
            updatedAt: Date.now(),
          },
        }
      }),

    renameLayer: (layerId, name) =>
      set((state) => ({
        pattern: {
          ...state.pattern,
          layers: state.pattern.layers.map((l) => (l.id === layerId ? { ...l, name } : l)),
          updatedAt: Date.now(),
        },
      })),

    setLayerGridKind: (layerId, kind) =>
      set((state) => ({
        pattern: {
          ...state.pattern,
          layers: state.pattern.layers.map((l) => {
            if (l.id !== layerId || l.grid.kind === kind) return l
            const grid =
              kind === 'rectangular'
                ? { kind: 'rectangular' as const, stepX: 1, stepY: 1 }
                : { kind: 'radial' as const, stepRadius: 1 }
            return { ...l, grid }
          }),
          updatedAt: Date.now(),
        },
      })),

    setLayerShift: (layerId, axis, value) =>
      set((state) => ({
        pattern: {
          ...state.pattern,
          layers: state.pattern.layers.map((l) =>
            l.id === layerId ? { ...l, shift: { ...l.shift, [axis]: value } } : l,
          ),
          updatedAt: Date.now(),
        },
      })),

    reset: (rows = 10, cols = 10) =>
      set({
        pattern: emptyPattern(rows, cols),
        selectedStitchIds: [],
        history: { past: [], future: [] },
        activeSide: 'right',
        activeMarker: false,
        activeThread: DEFAULT_THREAD_ID,
        activeLayer: DEFAULT_LAYER_ID,
      }),

    resizePattern: (rows, cols) =>
      set((state) => {
        const safeRows = Math.max(1, Math.min(200, rows))
        const safeCols = Math.max(1, Math.min(200, cols))
        return {
          pattern: { ...state.pattern, rows: safeRows, cols: safeCols, updatedAt: Date.now() },
        }
      }),

    loadPattern: (pattern) => {
      const normalized = normalizePattern(pattern)
      set({
        pattern: normalized,
        zoom: 1,
        selectedStitchIds: [],
        history: { past: [], future: [] },
        activeSide: 'right',
        activeMarker: false,
        activeThread: normalized.threads[0]?.id ?? DEFAULT_THREAD_ID,
        activeLayer: normalized.layers[0]?.id ?? DEFAULT_LAYER_ID,
      })
    },
  }
})
