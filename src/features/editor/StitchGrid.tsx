import { useRef, useEffect, useCallback } from 'react'
import { usePatternStore, nodeIdsForSelection } from '../../store/patternStore'
import type { Pattern, StitchNode } from '../../types/pattern'
import { placeGlyph } from './stitchGlyphs'
import {
  BASE_CELL_SIZE,
  MAX_ZOOM,
  HANDLE_HIT_RADIUS_PX,
  BODY_HIT_RADIUS_PX,
  MOVE_CANCEL_PX,
} from './constants'

const DEFAULT_INK = '#18181b'
const ACCENT = '#1d4ed8'

function nodePos(node: StitchNode, cellSize: number) {
  return { x: node.x * cellSize, y: node.y * cellSize }
}

function distToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
) {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

function draw(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  cellSize: number,
  selectedIds: Set<string>,
) {
  const width = pattern.cols * cellSize
  const height = pattern.rows * cellSize
  ctx.clearRect(0, 0, width, height)

  // Guideline dots — a soft hint of where things snap, not a hard grid.
  ctx.fillStyle = '#e4e4e7'
  for (let r = 0; r <= pattern.rows; r++) {
    for (let c = 0; c <= pattern.cols; c++) {
      ctx.beginPath()
      ctx.arc(c * cellSize, r * cellSize, 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const nodesById = new Map(pattern.nodes.map((n) => [n.id, n]))
  const refCount = new Map<string, number>()
  for (const s of pattern.stitches) {
    refCount.set(s.baseNodeId, (refCount.get(s.baseNodeId) ?? 0) + 1)
    refCount.set(s.tipNodeId, (refCount.get(s.tipNodeId) ?? 0) + 1)
  }

  const nominalLength = cellSize
  const normalWidth = Math.max(1.25, cellSize * 0.045)
  const selectedWidth = Math.max(2, cellSize * 0.07)

  for (const stitch of pattern.stitches) {
    const base = nodesById.get(stitch.baseNodeId)
    const tip = nodesById.get(stitch.tipNodeId)
    if (!base || !tip) continue
    const bp = nodePos(base, cellSize)
    const tp = nodePos(tip, cellSize)
    const isSelected = selectedIds.has(stitch.id)

    const length = Math.max(1, Math.hypot(tp.x - bp.x, tp.y - bp.y))
    const angle = Math.atan2(tp.y - bp.y, tp.x - bp.x)

    ctx.strokeStyle = isSelected ? ACCENT : stitch.color ?? DEFAULT_INK
    ctx.lineWidth = isSelected ? selectedWidth : normalWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    const polylines = placeGlyph(stitch.type, {
      baseX: bp.x,
      baseY: bp.y,
      length,
      angle,
      nominalLength,
    })
    for (const pts of polylines) {
      ctx.beginPath()
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
      ctx.stroke()
    }
  }

  // Shared-node markers: visible whenever 2+ stitches meet at a point,
  // so fans/clusters read clearly even when nothing is selected.
  for (const node of pattern.nodes) {
    const count = refCount.get(node.id) ?? 0
    if (count < 2) continue
    const p = nodePos(node, cellSize)
    ctx.beginPath()
    ctx.arc(p.x, p.y, Math.max(2, cellSize * 0.06), 0, Math.PI * 2)
    ctx.fillStyle = '#52525b'
    ctx.fill()
  }

  // Handles for the current selection.
  if (selectedIds.size > 0) {
    const handleNodeIds = new Set<string>()
    for (const s of pattern.stitches) {
      if (!selectedIds.has(s.id)) continue
      handleNodeIds.add(s.baseNodeId)
      handleNodeIds.add(s.tipNodeId)
    }
    for (const nodeId of handleNodeIds) {
      const node = nodesById.get(nodeId)
      if (!node) continue
      const p = nodePos(node, cellSize)
      const r = Math.max(5, cellSize * 0.14)
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = ACCENT
      ctx.stroke()

      const count = refCount.get(nodeId) ?? 0
      if (count > 1) {
        ctx.fillStyle = ACCENT
        ctx.font = `${Math.max(9, cellSize * 0.24)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(count), p.x, p.y)
      }
    }
  }
}

type DragKind =
  | { kind: 'handle'; nodeId: string }
  | { kind: 'body'; nodeIds: string[] }
  | { kind: 'empty' }

export function StitchGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    pattern,
    zoom,
    setZoom,
    registerCanvas,
    selectedStitchIds,
    selectOnly,
    toggleSelect,
    clearSelection,
    moveNode,
    finalizeNodeDrag,
    moveNodesBy,
  } = usePatternStore()

  const cellSize = BASE_CELL_SIZE * zoom

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{
    startDist: number
    startZoom: number
    startCenter: { x: number; y: number }
    startScroll: { left: number; top: number }
  } | null>(null)
  const dragRef = useRef<
    (DragKind & {
      startX: number
      startY: number
      prevGx: number
      prevGy: number
    }) | null
  >(null)

  useEffect(() => {
    registerCanvas(canvasRef.current)
    return () => registerCanvas(null)
  }, [registerCanvas])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = pattern.cols * cellSize
    const height = pattern.rows * cellSize
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    draw(ctx, pattern, cellSize, new Set(selectedStitchIds))
  }, [pattern, cellSize, selectedStitchIds])

  const clientToGrid = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { gx: 0, gy: 0 }
      const rect = canvas.getBoundingClientRect()
      return {
        gx: (clientX - rect.left) / cellSize,
        gy: (clientY - rect.top) / cellSize,
      }
    },
    [cellSize],
  )

  /** Hit-test a client point against handles (of the current selection)
   * first, then stitch bodies (topmost drawn wins), else empty space. */
  const hitTest = useCallback(
    (clientX: number, clientY: number): { kind: 'handle'; nodeId: string } | { kind: 'body'; stitchId: string } | { kind: 'empty' } => {
      const canvas = canvasRef.current
      if (!canvas) return { kind: 'empty' }
      const rect = canvas.getBoundingClientRect()
      const px = clientX - rect.left
      const py = clientY - rect.top
      const nodesById = new Map(pattern.nodes.map((n) => [n.id, n]))

      if (selectedStitchIds.length > 0) {
        for (const nodeId of nodeIdsForSelection(pattern, selectedStitchIds)) {
          const node = nodesById.get(nodeId)
          if (!node) continue
          const p = nodePos(node, cellSize)
          if (Math.hypot(px - p.x, py - p.y) <= HANDLE_HIT_RADIUS_PX) {
            return { kind: 'handle', nodeId }
          }
        }
      }

      for (let i = pattern.stitches.length - 1; i >= 0; i--) {
        const s = pattern.stitches[i]
        const base = nodesById.get(s.baseNodeId)
        const tip = nodesById.get(s.tipNodeId)
        if (!base || !tip) continue
        const bp = nodePos(base, cellSize)
        const tp = nodePos(tip, cellSize)
        if (distToSegment(px, py, bp.x, bp.y, tp.x, tp.y) <= BODY_HIT_RADIUS_PX) {
          return { kind: 'body', stitchId: s.id }
        }
      }
      return { kind: 'empty' }
    },
    [pattern, cellSize, selectedStitchIds],
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 2) {
        dragRef.current = null
        const pts = Array.from(pointers.current.values())
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        const container = containerRef.current
        pinchRef.current = {
          startDist: dist,
          startZoom: zoom,
          startCenter: {
            x: (pts[0].x + pts[1].x) / 2,
            y: (pts[0].y + pts[1].y) / 2,
          },
          startScroll: {
            left: container?.scrollLeft ?? 0,
            top: container?.scrollTop ?? 0,
          },
        }
        return
      }
      if (pointers.current.size > 2) return

      const hit = hitTest(e.clientX, e.clientY)
      const { gx, gy } = clientToGrid(e.clientX, e.clientY)
      const base = { startX: e.clientX, startY: e.clientY, prevGx: gx, prevGy: gy }

      if (hit.kind === 'handle') {
        dragRef.current = { kind: 'handle', nodeId: hit.nodeId, ...base }
        return
      }

      if (hit.kind === 'body') {
        const additive = e.shiftKey || e.ctrlKey || e.metaKey
        const alreadySelected = selectedStitchIds.includes(hit.stitchId)
        let nextSelection = selectedStitchIds
        if (additive) {
          toggleSelect(hit.stitchId)
          nextSelection = alreadySelected
            ? selectedStitchIds.filter((id) => id !== hit.stitchId)
            : [...selectedStitchIds, hit.stitchId]
        } else if (!alreadySelected) {
          selectOnly(hit.stitchId)
          nextSelection = [hit.stitchId]
        }
        dragRef.current = {
          kind: 'body',
          nodeIds: nodeIdsForSelection(pattern, nextSelection),
          ...base,
        }
        return
      }

      dragRef.current = { kind: 'empty', ...base }
    },
    [hitTest, clientToGrid, pattern, selectedStitchIds, selectOnly, toggleSelect, zoom],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!pointers.current.has(e.pointerId)) return
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

      if (pointers.current.size === 2 && pinchRef.current) {
        const pts = Array.from(pointers.current.values())
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
        const { startDist, startZoom, startCenter, startScroll } = pinchRef.current
        if (startDist > 0) {
          const next = startZoom * (dist / startDist)
          setZoom(Math.min(MAX_ZOOM, Math.max(0.5, next)))
        }
        const center = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
        const container = containerRef.current
        if (container) {
          container.scrollLeft = startScroll.left - (center.x - startCenter.x)
          container.scrollTop = startScroll.top - (center.y - startCenter.y)
        }
        return
      }

      const drag = dragRef.current
      if (!drag) return
      const { gx, gy } = clientToGrid(e.clientX, e.clientY)

      if (drag.kind === 'handle') {
        moveNode(drag.nodeId, gx, gy)
      } else if (drag.kind === 'body') {
        const dGx = gx - drag.prevGx
        const dGy = gy - drag.prevGy
        if (drag.nodeIds.length > 0) moveNodesBy(drag.nodeIds, dGx, dGy)
      }
      drag.prevGx = gx
      drag.prevGy = gy
    },
    [clientToGrid, setZoom, moveNode, moveNodesBy],
  )

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinchRef.current = null
      if (pointers.current.size > 0) return

      const drag = dragRef.current
      dragRef.current = null
      if (!drag) return

      if (drag.kind === 'handle') {
        finalizeNodeDrag(drag.nodeId)
      } else if (drag.kind === 'empty') {
        const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > MOVE_CANCEL_PX
        if (!moved) clearSelection()
      }
    },
    [finalizeNodeDrag, clearSelection],
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      setZoom(zoom - e.deltaY * 0.01)
    },
    [setZoom, zoom],
  )

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-auto touch-pan-x touch-pan-y"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onWheel={handleWheel}
        className="touch-none bg-white"
      />
    </div>
  )
}
