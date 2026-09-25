import { useRef, useEffect, useCallback, useState } from 'react'
import { usePatternStore, type Tool } from '../../store/patternStore'
import type { Pattern, Stitch, Thread } from '../../types/pattern'
import { placeGlyph, averageAttachmentAngle, YARN_OVERS } from './stitchGlyphs'
import { anchorPosition } from './anchorPosition'
import {
  BASE_CELL_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  HANDLE_HIT_RADIUS_PX,
  BODY_HIT_RADIUS_PX,
  MOVE_CANCEL_PX,
  GLYPH_HALO_RADIUS_RATIO,
} from './constants'

const DEFAULT_INK = '#18181b'
const ACCENT = '#1d4ed8'
const MARKER_COLOR = '#facc15'
/** How far beyond the guideline grid's own extent (in cells) the canvas
 * grows to keep showing stitches placed past its edge. */
const CONTENT_PADDING_CELLS = 2

/** #rrggbb -> {h (0-360), s (0-1), l (0-1)}. Falls back to black on any
 * unparseable input (e.g. an empty/partial value mid-edit). */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return { h: 0, s: 0, l: 0 }
  const r = parseInt(m[1].slice(0, 2), 16) / 255
  const g = parseInt(m[1].slice(2, 4), 16) / 255
  const b = parseInt(m[1].slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60
  else if (max === g) h = ((b - r) / d + 2) * 60
  else h = ((r - g) / d + 4) * 60
  return { h, s, l }
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r = 0
  let g = 0
  let b = 0
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const toByte = (v: number) => Math.round((v + m) * 255)
  return `#${[toByte(r), toByte(g), toByte(b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

/** A stitch's drawn color: its thread's color for the right side; the
 * same hue at reduced saturation for the wrong side (same-family
 * shading, not a second stored color — see `sideContrastAmount`). A
 * stitch's own `color`, when set, overrides the resolved color
 * outright. Selection highlight (accent blue) overrides all of it. */
function resolveStitchColor(
  stitch: Stitch,
  thread: Thread | undefined,
  isSelected: boolean,
  showSideContrast: boolean,
  sideContrastAmount: number,
) {
  if (isSelected) return ACCENT
  if (stitch.color) return stitch.color
  const base = thread?.color ?? DEFAULT_INK
  if (stitch.side !== 'wrong' || !showSideContrast) return base
  const { h, s, l } = hexToHsl(base)
  return hslToHex(h, s * sideContrastAmount, l)
}

interface LiveHandleDrag {
  stitchId: string
  index: number
  x: number
  y: number
}

/** Resolve everything needed to draw (and hit-test) one stitch: its own
 * pixel position, its glyph shape, its attachment handle positions, and
 * the pixel positions of whatever it's attached to (for drawing legs).
 * A live handle drag can override one attachment's target with the
 * pointer's current position, for a live preview while dragging. */
function resolveStitchRender(
  stitch: Stitch,
  stitchesById: Map<string, Stitch>,
  cellSize: number,
  nominalSize: number,
  variantId: string | undefined,
  liveOverride: LiveHandleDrag | null,
) {
  const posPx = { x: stitch.pos.x * cellSize, y: stitch.pos.y * cellSize }
  const targetPositions = stitch.anchors.map((anchor, i) => {
    if (liveOverride && liveOverride.stitchId === stitch.id && liveOverride.index === i) {
      return { x: liveOverride.x * cellSize, y: liveOverride.y * cellSize }
    }
    if (!anchor) return null
    const p = anchorPosition(anchor, stitchesById)
    return p ? { x: p.x * cellSize, y: p.y * cellSize } : null
  })
  const angle = averageAttachmentAngle(
    posPx.x,
    posPx.y,
    targetPositions.filter((p): p is { x: number; y: number } => p !== null),
  )
  const { shape, attachmentPoints } = placeGlyph(stitch.type, variantId, {
    posX: posPx.x,
    posY: posPx.y,
    targetAngle: angle,
    nominalSize,
  })
  return { posPx, shape, attachmentPoints, targetPositions }
}

function drawYarnOverTicks(
  ctx: CanvasRenderingContext2D,
  from: { x: number; y: number },
  to: { x: number; y: number },
  count: number,
  legWidth: number,
  color: string,
) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const tickLen = legWidth * 2.6
  const hx = (px * tickLen) / 2
  const hy = (py * tickLen) / 2
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : 0.3 + (0.4 * i) / (count - 1)
    const cx = from.x + dx * t
    const cy = from.y + dy * t
    // Casing first (background-colored, wide), then the visible tick on
    // top — same double-line technique as everything else, so a tick
    // never looks like it's fusing with whatever crosses under it.
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = legWidth * 2.4
    ctx.beginPath()
    ctx.moveTo(cx - hx, cy - hy)
    ctx.lineTo(cx + hx, cy + hy)
    ctx.stroke()
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(1, legWidth * 0.8)
    ctx.beginPath()
    ctx.moveTo(cx - hx, cy - hy)
    ctx.lineTo(cx + hx, cy + hy)
    ctx.stroke()
  }
}

/** The grid is a fixed `rows × cols` guideline, but stitches are free
 * {x,y} and can land past it (dragged, or placed by a sweep tool near
 * the edge) — so the canvas itself grows to cover whatever's actually
 * there, padded a couple of cells, instead of hard-clipping at the
 * guideline's own bounds. */
function contentExtent(pattern: Pattern): { cols: number; rows: number } {
  let maxX = pattern.cols
  let maxY = pattern.rows
  for (const s of pattern.stitches) {
    if (s.pos.x > maxX) maxX = s.pos.x
    if (s.pos.y > maxY) maxY = s.pos.y
  }
  return { cols: maxX + CONTENT_PADDING_CELLS, rows: maxY + CONTENT_PADDING_CELLS }
}

function draw(
  ctx: CanvasRenderingContext2D,
  pattern: Pattern,
  cellSize: number,
  nominalSize: number,
  haloRadius: number,
  selectedIds: Set<string>,
  showGuides: boolean,
  guideBrightness: number,
  showSequence: boolean,
  sequenceBrightness: number,
  liveOverride: LiveHandleDrag | null,
  showSideContrast: boolean,
  sideContrastAmount: number,
) {
  const extent = contentExtent(pattern)
  const width = extent.cols * cellSize
  const height = extent.rows * cellSize
  ctx.clearRect(0, 0, width, height)

  if (showGuides) {
    ctx.fillStyle = `rgba(24, 24, 27, ${guideBrightness * 0.4})`
    for (let r = 0; r <= pattern.rows; r++) {
      for (let c = 0; c <= pattern.cols; c++) {
        ctx.beginPath()
        ctx.arc(c * cellSize, r * cellSize, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  const BG = '#ffffff'
  const stitchesById = new Map(pattern.stitches.map((s) => [s.id, s]))
  const threadsById = new Map(pattern.threads.map((t) => [t.id, t]))

  const sequenceWidth = Math.max(1, cellSize * 0.025)
  const sequenceCasingWidth = sequenceWidth + Math.max(1.5, cellSize * 0.035)
  const legWidth = Math.max(1, cellSize * 0.045)
  const legCasingWidth = legWidth + Math.max(2, cellSize * 0.05)
  const normalWidth = Math.max(1.25, cellSize * 0.045)
  const selectedWidth = Math.max(2, cellSize * 0.07)
  const haloOutlineWidth = Math.max(2, cellSize * 0.05)

  const renders = pattern.stitches.map((stitch) => ({
    stitch,
    render: resolveStitchRender(
      stitch,
      stitchesById,
      cellSize,
      nominalSize,
      pattern.glyphVariants?.[stitch.type],
      liveOverride,
    ),
  }))

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Draw order is three complete stages, each stage its own full
  // background-then-color double pass — not interleaved with each
  // other — so a later stage always reads as visually on top of an
  // earlier one, on top of the guideline dots:
  //   1. the working-thread sequence line
  //   2. every attachment "leg" (+ yarn-over ticks)
  //   3. every symbol (halo circle, then its outline)

  // Stage 1 — sequence line, as a double line like everything else. Gray,
  // same ink as the guideline dots — its opacity is controlled by its own
  // brightness range, the same mechanism as the grid's.
  if (showSequence) {
    const sequenceColor = `rgba(24, 24, 27, ${sequenceBrightness})`
    for (const pass of ['casing', 'color'] as const) {
      for (let i = 0; i < pattern.sequence.length - 1; i++) {
        const a = stitchesById.get(pattern.sequence[i])
        const b = stitchesById.get(pattern.sequence[i + 1])
        if (!a || !b) continue
        const ax = a.pos.x * cellSize
        const ay = a.pos.y * cellSize
        const bx = b.pos.x * cellSize
        const by = b.pos.y * cellSize
        ctx.strokeStyle = pass === 'casing' ? BG : sequenceColor
        ctx.lineWidth = pass === 'casing' ? sequenceCasingWidth : sequenceWidth
        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.stroke()
      }
    }
  }

  // Stage 2 — every attachment leg (+ its yarn-over ticks).
  for (const pass of ['casing', 'color'] as const) {
    for (const { stitch, render } of renders) {
      const isSelected = selectedIds.has(stitch.id)
      const color = resolveStitchColor(
        stitch,
        threadsById.get(stitch.thread),
        isSelected,
        showSideContrast,
        sideContrastAmount,
      )
      const ticks = YARN_OVERS[stitch.type]
      for (const target of render.targetPositions) {
        if (!target) continue
        ctx.strokeStyle = pass === 'casing' ? BG : color
        ctx.lineWidth = pass === 'casing' ? legCasingWidth : legWidth
        ctx.beginPath()
        ctx.moveTo(render.posPx.x, render.posPx.y)
        ctx.lineTo(target.x, target.y)
        ctx.stroke()

        if (pass === 'color' && ticks > 0) {
          drawYarnOverTicks(ctx, render.posPx, target, ticks, legWidth, color)
        }
      }
    }
  }

  // Stage 3 — every symbol: its halo circle (background fill + thick
  // outline, clearing the area it sits in), then its own outline. A
  // glyph's body is authored to always fit inside that circle, so the
  // halo alone keeps the symbol's interior clean — no per-shape
  // fill/casing logic needed beyond it.
  for (const pass of ['casing', 'color'] as const) {
    for (const { stitch, render } of renders) {
      const isSelected = selectedIds.has(stitch.id)
      const color = resolveStitchColor(
        stitch,
        threadsById.get(stitch.thread),
        isSelected,
        showSideContrast,
        sideContrastAmount,
      )
      const w = isSelected ? selectedWidth : normalWidth

      if (pass === 'casing') {
        ctx.beginPath()
        ctx.arc(render.posPx.x, render.posPx.y, haloRadius, 0, Math.PI * 2)
        ctx.fillStyle = BG
        ctx.fill()
        ctx.strokeStyle = BG
        ctx.lineWidth = haloOutlineWidth
        ctx.stroke()
      }

      for (const poly of render.shape) {
        ctx.beginPath()
        poly.points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
        if (poly.closed) ctx.closePath()

        if (pass === 'casing') {
          ctx.strokeStyle = BG
          ctx.lineWidth = w + haloOutlineWidth
          ctx.stroke()
        } else {
          if (poly.filled) {
            ctx.fillStyle = color
            ctx.fill()
          }
          ctx.strokeStyle = color
          ctx.lineWidth = w
          ctx.stroke()
        }
      }
    }
  }

  // Stage 4 — marker badge: a small bright dot layered on top of any
  // stitch flagged `marker`, so it reads clearly over stage 3's glyph.
  for (const { stitch, render } of renders) {
    if (!stitch.marker) continue
    const bx = render.posPx.x + haloRadius * 0.62
    const by = render.posPx.y - haloRadius * 0.62
    const r = Math.max(2, haloRadius * 0.32)
    ctx.beginPath()
    ctx.arc(bx, by, r, 0, Math.PI * 2)
    ctx.fillStyle = BG
    ctx.fill()
    ctx.beginPath()
    ctx.arc(bx, by, r * 0.72, 0, Math.PI * 2)
    ctx.fillStyle = MARKER_COLOR
    ctx.fill()
  }

  // Attachment handles for the current selection.
  for (const { stitch, render } of renders) {
    if (!selectedIds.has(stitch.id)) continue
    for (const p of render.attachmentPoints) {
      const r = Math.max(5, cellSize * 0.13)
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = ACCENT
      ctx.stroke()
    }
  }
}

type DragState =
  | { kind: 'sweep'; tool: Exclude<Tool, null>; visited: Set<string> }
  | { kind: 'handle'; stitchId: string; index: number }
  | { kind: 'body'; ids: string[]; prevGx: number; prevGy: number }
  | { kind: 'empty'; startX: number; startY: number }

export function StitchGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    pattern,
    zoom,
    setZoom,
    showGuides,
    guideBrightness,
    showSequence,
    sequenceBrightness,
    showSideContrast,
    sideContrastAmount,
    registerCanvas,
    registerFitView,
    selectedStitchIds,
    selectOnly,
    toggleSelect,
    clearSelection,
    activeTool,
    beginGesture,
    finalizeStitchPos,
    moveStitchesBy,
    commitAttachmentDrag,
    applyAddAt,
    applySelectAt,
    applyDeleteAt,
    noteMoveTarget,
    commitMoveSweep,
  } = usePatternStore()

  const cellSize = BASE_CELL_SIZE * zoom
  const haloRadius = cellSize * GLYPH_HALO_RADIUS_RATIO
  const nominalSize = haloRadius * 2

  const [liveHandleDrag, setLiveHandleDrag] = useState<LiveHandleDrag | null>(null)

  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{
    startDist: number
    startZoom: number
    startCenter: { x: number; y: number }
    startScroll: { left: number; top: number }
  } | null>(null)
  const dragRef = useRef<DragState | null>(null)

  useEffect(() => {
    registerCanvas(canvasRef.current)
    return () => registerCanvas(null)
  }, [registerCanvas])

  // Fit-to-content: zoom + scroll so the whole pattern (or, if it's
  // empty, the guideline grid) is visible. Registered with the store so
  // a toolbar button elsewhere can trigger it without owning these refs.
  useEffect(() => {
    const fit = () => {
      const container = containerRef.current
      if (!container) return
      const extent = contentExtent(pattern)
      const availW = container.clientWidth - 24
      const availH = container.clientHeight - 24
      const fitZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, Math.min(availW / (extent.cols * BASE_CELL_SIZE), availH / (extent.rows * BASE_CELL_SIZE))),
      )
      setZoom(fitZoom)
      // Scroll happens after the zoom-triggered resize effect below has
      // resized the canvas — next frame is enough for that layout pass.
      requestAnimationFrame(() => {
        container.scrollLeft = 0
        container.scrollTop = 0
      })
    }
    registerFitView(fit)
    return () => registerFitView(null)
  }, [pattern, registerFitView, setZoom])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const extent = contentExtent(pattern)
    const width = extent.cols * cellSize
    const height = extent.rows * cellSize
    canvas.width = width * dpr
    canvas.height = height * dpr
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    draw(
      ctx,
      pattern,
      cellSize,
      nominalSize,
      haloRadius,
      new Set(selectedStitchIds),
      showGuides,
      guideBrightness,
      showSequence,
      sequenceBrightness,
      liveHandleDrag,
      showSideContrast,
      sideContrastAmount,
    )
  }, [
    pattern,
    cellSize,
    nominalSize,
    haloRadius,
    selectedStitchIds,
    showGuides,
    guideBrightness,
    showSequence,
    sequenceBrightness,
    showSideContrast,
    sideContrastAmount,
    liveHandleDrag,
  ])

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

  /** Hit-test a client point: handles of the current selection first,
   * then stitch bodies (topmost drawn wins), else empty space. */
  const hitTest = useCallback(
    (
      clientX: number,
      clientY: number,
    ):
      | { kind: 'handle'; stitchId: string; index: number }
      | { kind: 'body'; stitchId: string }
      | { kind: 'empty' } => {
      const canvas = canvasRef.current
      if (!canvas) return { kind: 'empty' }
      const rect = canvas.getBoundingClientRect()
      const px = clientX - rect.left
      const py = clientY - rect.top
      const stitchesById = new Map(pattern.stitches.map((s) => [s.id, s]))

      if (selectedStitchIds.length > 0) {
        for (const id of selectedStitchIds) {
          const stitch = stitchesById.get(id)
          if (!stitch) continue
          const render = resolveStitchRender(
            stitch,
            stitchesById,
            cellSize,
            nominalSize,
            pattern.glyphVariants?.[stitch.type],
            null,
          )
          for (let i = 0; i < render.attachmentPoints.length; i++) {
            const p = render.attachmentPoints[i]
            if (Math.hypot(px - p.x, py - p.y) <= HANDLE_HIT_RADIUS_PX) {
              return { kind: 'handle', stitchId: id, index: i }
            }
          }
        }
      }

      for (let i = pattern.stitches.length - 1; i >= 0; i--) {
        const s = pattern.stitches[i]
        const posPx = { x: s.pos.x * cellSize, y: s.pos.y * cellSize }
        if (Math.hypot(px - posPx.x, py - posPx.y) <= BODY_HIT_RADIUS_PX) {
          return { kind: 'body', stitchId: s.id }
        }
      }
      return { kind: 'empty' }
    },
    [pattern, cellSize, nominalSize, selectedStitchIds],
  )

  const applySweepPoint = useCallback(
    (tool: Exclude<Tool, null>, gx: number, gy: number, visited: Set<string>) => {
      if (tool === 'add') {
        const key = `${Math.round(gx)},${Math.round(gy)}`
        if (visited.has(key)) return
        visited.add(key)
        applyAddAt(gx, gy)
      } else if (tool === 'select') {
        applySelectAt(gx, gy)
      } else if (tool === 'delete') {
        applyDeleteAt(gx, gy)
      } else if (tool === 'move') {
        noteMoveTarget(gx, gy)
      }
    },
    [applyAddAt, applySelectAt, applyDeleteAt, noteMoveTarget],
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
          startCenter: { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 },
          startScroll: { left: container?.scrollLeft ?? 0, top: container?.scrollTop ?? 0 },
        }
        return
      }
      if (pointers.current.size > 2) return

      const { gx, gy } = clientToGrid(e.clientX, e.clientY)

      if (activeTool) {
        beginGesture()
        const visited = new Set<string>()
        dragRef.current = { kind: 'sweep', tool: activeTool, visited }
        applySweepPoint(activeTool, gx, gy, visited)
        return
      }

      const hit = hitTest(e.clientX, e.clientY)

      if (hit.kind === 'handle') {
        beginGesture()
        setLiveHandleDrag({ stitchId: hit.stitchId, index: hit.index, x: gx, y: gy })
        dragRef.current = { kind: 'handle', stitchId: hit.stitchId, index: hit.index }
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
        beginGesture()
        dragRef.current = { kind: 'body', ids: nextSelection, prevGx: gx, prevGy: gy }
        return
      }

      dragRef.current = { kind: 'empty', startX: e.clientX, startY: e.clientY }
    },
    [
      activeTool,
      beginGesture,
      applySweepPoint,
      clientToGrid,
      hitTest,
      selectedStitchIds,
      selectOnly,
      toggleSelect,
      zoom,
    ],
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
          setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next)))
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

      if (drag.kind === 'sweep') {
        applySweepPoint(drag.tool, gx, gy, drag.visited)
      } else if (drag.kind === 'handle') {
        setLiveHandleDrag({ stitchId: drag.stitchId, index: drag.index, x: gx, y: gy })
      } else if (drag.kind === 'body') {
        const dGx = gx - drag.prevGx
        const dGy = gy - drag.prevGy
        if (drag.ids.length > 0) moveStitchesBy(drag.ids, dGx, dGy)
        drag.prevGx = gx
        drag.prevGy = gy
      }
    },
    [clientToGrid, setZoom, applySweepPoint, moveStitchesBy],
  )

  const endPointer = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      pointers.current.delete(e.pointerId)
      if (pointers.current.size < 2) pinchRef.current = null
      if (pointers.current.size > 0) return

      const drag = dragRef.current
      dragRef.current = null
      if (!drag) return

      if (drag.kind === 'sweep') {
        if (drag.tool === 'move') commitMoveSweep()
        return
      }
      if (drag.kind === 'handle') {
        const live = liveHandleDrag
        setLiveHandleDrag(null)
        if (live) commitAttachmentDrag(live.stitchId, live.index, live.x, live.y)
        return
      }
      if (drag.kind === 'body') {
        for (const id of drag.ids) finalizeStitchPos(id)
        return
      }
      if (drag.kind === 'empty') {
        const moved = Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) > MOVE_CANCEL_PX
        if (!moved) clearSelection()
      }
    },
    [commitMoveSweep, liveHandleDrag, commitAttachmentDrag, finalizeStitchPos, clearSelection],
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
