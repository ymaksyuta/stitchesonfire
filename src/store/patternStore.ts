import { create } from 'zustand'
import type { Pattern, Stitch, StitchType } from '../types/pattern'
import { ATTACHMENT_ARITY } from '../types/pattern'
import {
  BASE_CELL_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  SNAP_RADIUS_GRID,
  STITCH_HIT_RADIUS_GRID,
} from '../features/editor/constants'

export type Tool = 'add' | 'select' | 'delete' | 'move' | null

function emptyPattern(rows: number, cols: number): Pattern {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: 'Untitled pattern',
    rows,
    cols,
    stitches: [],
    sequence: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** Defensive against patterns saved before this rewrite. */
function normalizePattern(p: Pattern): Pattern {
  return {
    ...p,
    stitches: Array.isArray(p.stitches) ? p.stitches : [],
    sequence: Array.isArray(p.sequence) ? p.sequence : [],
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

function resizeAttachments(attachments: (string | null)[], arity: number) {
  const next = attachments.slice(0, arity)
  while (next.length < arity) next.push(null)
  return next
}

/** Detach every attachment pointing at `id` (used when `id` is deleted,
 * so nothing is left referencing a stitch that no longer exists). */
function detachReferencesTo(stitches: Stitch[], id: string) {
  return stitches.map((s) =>
    s.attachments.includes(id)
      ? { ...s, attachments: s.attachments.map((a) => (a === id ? null : a)) }
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
  activeStitch: StitchType
  activeColor: string | undefined
  zoom: number
  showGuides: boolean
  selectedStitchIds: string[] // order matters; last = "current"
  activeTool: Tool
  canvasEl: HTMLCanvasElement | null
  dragPreview: PaletteDrag | null
  history: { past: Pattern[]; future: Pattern[] }
  /** Last stitch touched during an active Move-tool sweep; internal to
   * commitMoveSweep, not meant to be read by UI code. */
  lastMoveTarget: string | null

  setActiveStitch: (stitch: StitchType) => void
  setActiveColor: (color: string | undefined) => void
  setZoom: (zoom: number) => void
  toggleGuides: () => void
  setActiveTool: (tool: Tool) => void
  registerCanvas: (el: HTMLCanvasElement | null) => void

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
  reset: (rows?: number, cols?: number) => void
  resizePattern: (rows: number, cols: number) => void
  loadPattern: (pattern: Pattern) => void
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
  function insertStitch(
    pattern: Pattern,
    selectedStitchIds: string[],
    type: StitchType,
    color: string | undefined,
    x: number,
    y: number,
    attachTo: string | null,
  ) {
    const arity = ATTACHMENT_ARITY[type]
    const attachments = resizeAttachments(attachTo ? [attachTo] : [], arity)
    const stitch: Stitch = {
      id: crypto.randomUUID(),
      type,
      color,
      pos: { x, y },
      attachments,
    }
    const currentId = selectedStitchIds[selectedStitchIds.length - 1]
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
    activeColor: undefined,
    zoom: 1,
    showGuides: true,
    selectedStitchIds: [],
    activeTool: null,
    canvasEl: null,
    dragPreview: null,
    history: { past: [], future: [] },
    lastMoveTarget: null,

    setActiveStitch: (stitch) => set({ activeStitch: stitch }),
    setActiveColor: (color) => set({ activeColor: color }),
    setZoom: (zoom) =>
      set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),
    toggleGuides: () => set((state) => ({ showGuides: !state.showGuides })),
    setActiveTool: (tool) =>
      set((state) => ({ activeTool: state.activeTool === tool ? null : tool })),

    registerCanvas: (el) => set({ canvasEl: el }),

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
        return {
          pattern: {
            ...state.pattern,
            stitches: state.pattern.stitches.map((s) =>
              s.id === stitchId
                ? {
                    ...s,
                    attachments: s.attachments.map((a, i) => (i === index ? target?.id ?? null : a)),
                  }
                : s,
            ),
            updatedAt: Date.now(),
          },
        }
      }),

    applyAddAt: (x, y) =>
      set((state) => {
        const snapped = snapToGuideline(x, y)
        const existing = findStitchNear(state.pattern.stitches, snapped.x, snapped.y)
        if (existing) {
          return {
            selectedStitchIds: [existing.id],
            pattern: {
              ...state.pattern,
              stitches: state.pattern.stitches.map((s) =>
                s.id === existing.id
                  ? {
                      ...s,
                      type: state.activeStitch,
                      color: state.activeColor,
                      attachments: resizeAttachments(s.attachments, ATTACHMENT_ARITY[state.activeStitch]),
                    }
                  : s,
              ),
              updatedAt: Date.now(),
            },
          }
        }
        const { pattern, stitchId } = insertStitch(
          state.pattern,
          state.selectedStitchIds,
          state.activeStitch,
          state.activeColor,
          snapped.x,
          snapped.y,
          null,
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

    reset: (rows = 10, cols = 10) =>
      set({
        pattern: emptyPattern(rows, cols),
        selectedStitchIds: [],
        history: { past: [], future: [] },
      }),

    resizePattern: (rows, cols) =>
      set((state) => {
        const safeRows = Math.max(1, Math.min(200, rows))
        const safeCols = Math.max(1, Math.min(200, cols))
        return {
          pattern: { ...state.pattern, rows: safeRows, cols: safeCols, updatedAt: Date.now() },
        }
      }),

    loadPattern: (pattern) =>
      set({
        pattern: normalizePattern(pattern),
        zoom: 1,
        selectedStitchIds: [],
        history: { past: [], future: [] },
      }),
  }
})
