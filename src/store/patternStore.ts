import { create } from 'zustand'
import type { Pattern, StitchNode, Stitch, StitchType } from '../types/pattern'
import {
  BASE_CELL_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  SNAP_RADIUS_GRID,
  DEFAULT_TIP_OFFSET,
} from '../features/editor/constants'

function emptyPattern(rows: number, cols: number): Pattern {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: 'Untitled pattern',
    rows,
    cols,
    nodes: [],
    stitches: [],
    createdAt: now,
    updatedAt: now,
  }
}

/** Defensive against patterns saved before the node-graph rewrite. */
function normalizePattern(p: Pattern): Pattern {
  return {
    ...p,
    nodes: Array.isArray(p.nodes) ? p.nodes : [],
    stitches: Array.isArray(p.stitches) ? p.stitches : [],
  }
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by)
}

/**
 * Snap (x, y) to the nearest existing node within range first (so stitches
 * naturally share endpoints), then to the nearest guideline intersection,
 * otherwise return the point unchanged.
 */
function snapPoint(
  x: number,
  y: number,
  nodes: StitchNode[],
  excludeNodeIds: Set<string>,
): { x: number; y: number; mergeNodeId?: string } {
  let nearestNode: StitchNode | null = null
  let nearestNodeDist = Infinity
  for (const n of nodes) {
    if (excludeNodeIds.has(n.id)) continue
    const d = dist(x, y, n.x, n.y)
    if (d < nearestNodeDist) {
      nearestNodeDist = d
      nearestNode = n
    }
  }
  if (nearestNode && nearestNodeDist <= SNAP_RADIUS_GRID) {
    return { x: nearestNode.x, y: nearestNode.y, mergeNodeId: nearestNode.id }
  }

  const gx = Math.round(x)
  const gy = Math.round(y)
  if (dist(x, y, gx, gy) <= SNAP_RADIUS_GRID) {
    return { x: gx, y: gy }
  }

  return { x, y }
}

/** Nodes referenced by any stitch in `stitchIds`, deduplicated. */
function nodeIdsForStitches(stitches: Stitch[], stitchIds: Set<string>) {
  const ids = new Set<string>()
  for (const s of stitches) {
    if (!stitchIds.has(s.id)) continue
    ids.add(s.baseNodeId)
    ids.add(s.tipNodeId)
  }
  return ids
}

/** Drop nodes no stitch references anymore. */
function pruneOrphanNodes(nodes: StitchNode[], stitches: Stitch[]) {
  const referenced = new Set<string>()
  for (const s of stitches) {
    referenced.add(s.baseNodeId)
    referenced.add(s.tipNodeId)
  }
  return nodes.filter((n) => referenced.has(n.id))
}

interface PaletteDrag {
  type: StitchType
  color: string | undefined
  clientX: number
  clientY: number
}

interface PatternState {
  pattern: Pattern
  activeStitch: StitchType
  activeColor: string | undefined
  zoom: number
  selectedStitchIds: string[]
  canvasEl: HTMLCanvasElement | null
  dragPreview: PaletteDrag | null

  setActiveStitch: (stitch: StitchType) => void
  setActiveColor: (color: string | undefined) => void
  setZoom: (zoom: number) => void

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
  clearSelection: () => void

  moveNode: (nodeId: string, x: number, y: number) => void
  finalizeNodeDrag: (nodeId: string) => void
  moveNodesBy: (nodeIds: string[], dx: number, dy: number) => void
  deleteSelectedStitches: () => void
  setSelectedType: (type: StitchType) => void
  setSelectedColor: (color: string | undefined) => void

  reset: (rows?: number, cols?: number) => void
  resizePattern: (rows: number, cols: number) => void
  loadPattern: (pattern: Pattern) => void
}

export const usePatternStore = create<PatternState>((set) => ({
  pattern: emptyPattern(10, 10),
  activeStitch: 'chain',
  activeColor: undefined,
  zoom: 1,
  selectedStitchIds: [],
  canvasEl: null,
  dragPreview: null,

  setActiveStitch: (stitch) => set({ activeStitch: stitch }),
  setActiveColor: (color) => set({ activeColor: color }),
  setZoom: (zoom) =>
    set({ zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom)) }),

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

  endPaletteDrag: () =>
    set((state) => {
      const drag = state.dragPreview
      const canvas = state.canvasEl
      if (!drag || !canvas) return { dragPreview: null }

      const rect = canvas.getBoundingClientRect()
      const cellSize = BASE_CELL_SIZE * state.zoom
      const px = drag.clientX - rect.left
      const py = drag.clientY - rect.top
      if (px < 0 || py < 0 || px > rect.width || py > rect.height) {
        // Dropped outside the canvas — cancel, nothing placed.
        return { dragPreview: null }
      }

      const gx = px / cellSize
      const gy = py / cellSize

      const baseSnap = snapPoint(gx, gy, state.pattern.nodes, new Set())
      const baseNode: StitchNode = baseSnap.mergeNodeId
        ? state.pattern.nodes.find((n) => n.id === baseSnap.mergeNodeId)!
        : { id: crypto.randomUUID(), x: baseSnap.x, y: baseSnap.y }

      const tipRawX = baseNode.x + DEFAULT_TIP_OFFSET.dx
      const tipRawY = baseNode.y + DEFAULT_TIP_OFFSET.dy
      const tipSnap = snapPoint(
        tipRawX,
        tipRawY,
        state.pattern.nodes,
        new Set([baseNode.id]),
      )
      const tipNode: StitchNode = tipSnap.mergeNodeId
        ? state.pattern.nodes.find((n) => n.id === tipSnap.mergeNodeId)!
        : { id: crypto.randomUUID(), x: tipSnap.x, y: tipSnap.y }

      const nodes = [...state.pattern.nodes]
      if (!baseSnap.mergeNodeId) nodes.push(baseNode)
      if (!tipSnap.mergeNodeId) nodes.push(tipNode)

      const stitch: Stitch = {
        id: crypto.randomUUID(),
        type: drag.type,
        color: drag.color,
        baseNodeId: baseNode.id,
        tipNodeId: tipNode.id,
      }

      return {
        dragPreview: null,
        selectedStitchIds: [stitch.id],
        pattern: {
          ...state.pattern,
          nodes,
          stitches: [...state.pattern.stitches, stitch],
          updatedAt: Date.now(),
        },
      }
    }),

  selectOnly: (stitchId) => set({ selectedStitchIds: [stitchId] }),
  toggleSelect: (stitchId) =>
    set((state) => ({
      selectedStitchIds: state.selectedStitchIds.includes(stitchId)
        ? state.selectedStitchIds.filter((id) => id !== stitchId)
        : [...state.selectedStitchIds, stitchId],
    })),
  clearSelection: () => set({ selectedStitchIds: [] }),

  // Live position update while a single handle is being dragged — no
  // snapping mid-drag, so the point follows the finger/cursor exactly.
  moveNode: (nodeId, x, y) =>
    set((state) => ({
      pattern: {
        ...state.pattern,
        nodes: state.pattern.nodes.map((n) =>
          n.id === nodeId ? { ...n, x, y } : n,
        ),
      },
    })),

  // Called on pointer-up after a handle drag: snap to a nearby node (and
  // merge into it, forming a shared fan/cluster point) or to a guideline.
  finalizeNodeDrag: (nodeId) =>
    set((state) => {
      const node = state.pattern.nodes.find((n) => n.id === nodeId)
      if (!node) return {}

      const snap = snapPoint(
        node.x,
        node.y,
        state.pattern.nodes,
        new Set([nodeId]),
      )

      if (snap.mergeNodeId && snap.mergeNodeId !== nodeId) {
        const targetId = snap.mergeNodeId
        const stitches = state.pattern.stitches.map((s) => ({
          ...s,
          baseNodeId: s.baseNodeId === nodeId ? targetId : s.baseNodeId,
          tipNodeId: s.tipNodeId === nodeId ? targetId : s.tipNodeId,
        }))
        const nodes = pruneOrphanNodes(state.pattern.nodes, stitches)
        return {
          pattern: {
            ...state.pattern,
            nodes,
            stitches,
            updatedAt: Date.now(),
          },
        }
      }

      return {
        pattern: {
          ...state.pattern,
          nodes: state.pattern.nodes.map((n) =>
            n.id === nodeId ? { ...n, x: snap.x, y: snap.y } : n,
          ),
          updatedAt: Date.now(),
        },
      }
    }),

  // Rigid translation of a whole stitch (or the whole selection): every
  // node these stitches reference moves by the same delta. Any other,
  // unselected stitch sharing one of those nodes simply deforms — its own
  // *other* endpoint is untouched, so the change never cascades further.
  moveNodesBy: (nodeIds, dx, dy) =>
    set((state) => {
      const idSet = new Set(nodeIds)
      return {
        pattern: {
          ...state.pattern,
          nodes: state.pattern.nodes.map((n) =>
            idSet.has(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n,
          ),
          updatedAt: Date.now(),
        },
      }
    }),

  deleteSelectedStitches: () =>
    set((state) => {
      if (state.selectedStitchIds.length === 0) return {}
      const selected = new Set(state.selectedStitchIds)
      const stitches = state.pattern.stitches.filter(
        (s) => !selected.has(s.id),
      )
      const nodes = pruneOrphanNodes(state.pattern.nodes, stitches)
      return {
        selectedStitchIds: [],
        pattern: {
          ...state.pattern,
          nodes,
          stitches,
          updatedAt: Date.now(),
        },
      }
    }),

  setSelectedType: (type) =>
    set((state) => {
      if (state.selectedStitchIds.length === 0) return { activeStitch: type }
      const selected = new Set(state.selectedStitchIds)
      return {
        activeStitch: type,
        pattern: {
          ...state.pattern,
          stitches: state.pattern.stitches.map((s) =>
            selected.has(s.id) ? { ...s, type } : s,
          ),
          updatedAt: Date.now(),
        },
      }
    }),

  setSelectedColor: (color) =>
    set((state) => {
      if (state.selectedStitchIds.length === 0) return { activeColor: color }
      const selected = new Set(state.selectedStitchIds)
      return {
        activeColor: color,
        pattern: {
          ...state.pattern,
          stitches: state.pattern.stitches.map((s) =>
            selected.has(s.id) ? { ...s, color } : s,
          ),
          updatedAt: Date.now(),
        },
      }
    }),

  reset: (rows = 10, cols = 10) =>
    set({ pattern: emptyPattern(rows, cols), selectedStitchIds: [] }),

  resizePattern: (rows, cols) =>
    set((state) => {
      const safeRows = Math.max(1, Math.min(200, rows))
      const safeCols = Math.max(1, Math.min(200, cols))
      return {
        pattern: {
          ...state.pattern,
          rows: safeRows,
          cols: safeCols,
          updatedAt: Date.now(),
        },
      }
    }),

  loadPattern: (pattern) =>
    set({
      pattern: normalizePattern(pattern),
      zoom: 1,
      selectedStitchIds: [],
    }),
}))

/** Nodes referenced by a set of stitch ids, deduplicated. Exported for the
 * canvas layer, which needs it to drive group body-drags. */
export function nodeIdsForSelection(pattern: Pattern, stitchIds: string[]) {
  return Array.from(nodeIdsForStitches(pattern.stitches, new Set(stitchIds)))
}
