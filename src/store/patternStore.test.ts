import { beforeEach, describe, expect, it } from 'vitest'
import { usePatternStore } from './patternStore'
import type { Pattern } from '../types/pattern'

// A stand-in canvas with a fixed, predictable bounding box so palette-drag
// client coordinates convert to known grid coordinates in tests.
const fakeCanvas = {
  getBoundingClientRect: () => ({
    left: 0,
    top: 0,
    right: 1000,
    bottom: 1000,
    width: 1000,
    height: 1000,
    x: 0,
    y: 0,
    toJSON() {},
  }),
} as unknown as HTMLCanvasElement

beforeEach(() => {
  usePatternStore.getState().reset(10, 10)
  usePatternStore.setState({
    activeColor: undefined,
    zoom: 1,
    selectedStitchIds: [],
    dragPreview: null,
  })
  usePatternStore.getState().registerCanvas(fakeCanvas)
})

describe('patternStore', () => {
  it('places a stitch by dragging from the palette, snapped to the guideline grid', () => {
    const { beginPaletteDrag, endPaletteDrag } = usePatternStore.getState()
    // zoom 1 -> cellSize 36px, so (73, 71) is close enough to grid point (2,2) to snap.
    beginPaletteDrag('chain', '#b45309', 73, 71)
    endPaletteDrag()

    const { pattern, selectedStitchIds } = usePatternStore.getState()
    expect(pattern.stitches).toHaveLength(1)
    const stitch = pattern.stitches[0]
    expect(stitch.type).toBe('chain')
    expect(stitch.color).toBe('#b45309')
    expect(selectedStitchIds).toEqual([stitch.id])

    const base = pattern.nodes.find((n) => n.id === stitch.baseNodeId)!
    const tip = pattern.nodes.find((n) => n.id === stitch.tipNodeId)!
    expect(base.x).toBeCloseTo(2)
    expect(base.y).toBeCloseTo(2)
    // Default tip sits one guideline row "up" (toward row 0) from the base.
    expect(tip.x).toBeCloseTo(2)
    expect(tip.y).toBeCloseTo(1)
  })

  it('does not place anything when the drop lands outside the canvas', () => {
    const { beginPaletteDrag, endPaletteDrag } = usePatternStore.getState()
    beginPaletteDrag('chain', undefined, -50, -50)
    endPaletteDrag()
    expect(usePatternStore.getState().pattern.stitches).toHaveLength(0)
  })

  it('dragging one stitch base onto another forms a fan (shared base, distinct tips)', () => {
    const { beginPaletteDrag, endPaletteDrag, moveNode, finalizeNodeDrag } =
      usePatternStore.getState()
    beginPaletteDrag('single', undefined, 72, 72) // base (2,2), tip (2,1)
    endPaletteDrag()
    beginPaletteDrag('single', undefined, 144, 72) // base (4,2), tip (4,1)
    endPaletteDrag()

    const midway = usePatternStore.getState().pattern
    const firstBaseId = midway.stitches[0].baseNodeId
    const secondBaseId = midway.stitches[1].baseNodeId
    expect(firstBaseId).not.toBe(secondBaseId)

    // Drag the second stitch's base onto the first stitch's base node.
    const firstBase = midway.nodes.find((n) => n.id === firstBaseId)!
    moveNode(secondBaseId, firstBase.x, firstBase.y)
    finalizeNodeDrag(secondBaseId)

    const { pattern } = usePatternStore.getState()
    expect(pattern.stitches).toHaveLength(2)
    expect(pattern.stitches[0].baseNodeId).toBe(pattern.stitches[1].baseNodeId)
    // One shared base + two distinct tips = 3 nodes.
    expect(pattern.nodes).toHaveLength(3)
  })

  it('dragging one stitch onto another merges their nearby endpoints into a shared node', () => {
    const { beginPaletteDrag, endPaletteDrag, moveNode, finalizeNodeDrag } =
      usePatternStore.getState()
    beginPaletteDrag('single', undefined, 72, 72) // base (2,2), tip (2,1)
    endPaletteDrag()
    beginPaletteDrag('single', undefined, 180, 72) // base (5,2), tip (5,1)
    endPaletteDrag()

    const before = usePatternStore.getState().pattern
    const secondTipId = before.stitches[1].tipNodeId
    const firstTipId = before.stitches[0].tipNodeId
    expect(before.nodes).toHaveLength(4)

    // Drag the second stitch's tip right on top of the first stitch's tip.
    const firstTip = before.nodes.find((n) => n.id === firstTipId)!
    moveNode(secondTipId, firstTip.x, firstTip.y)
    finalizeNodeDrag(secondTipId)

    const after = usePatternStore.getState().pattern
    expect(after.nodes).toHaveLength(3)
    expect(after.stitches[1].tipNodeId).toBe(firstTipId)
  })

  it('moving a stitch deforms its neighbor but never cascades further', () => {
    // Manually wire up: stitch A (nodeA -> nodeShared), stitch B (nodeShared -> nodeC).
    const pattern: Pattern = {
      id: 'p1',
      name: 'test',
      rows: 10,
      cols: 10,
      nodes: [
        { id: 'nodeA', x: 0, y: 2 },
        { id: 'nodeShared', x: 0, y: 1 },
        { id: 'nodeC', x: 0, y: 0 },
      ],
      stitches: [
        { id: 'sA', type: 'chain', baseNodeId: 'nodeA', tipNodeId: 'nodeShared' },
        { id: 'sB', type: 'chain', baseNodeId: 'nodeShared', tipNodeId: 'nodeC' },
      ],
      createdAt: 0,
      updatedAt: 0,
    }
    usePatternStore.getState().loadPattern(pattern)
    // Move only stitch A's nodes (its own base + the shared tip it references).
    usePatternStore.getState().moveNodesBy(['nodeA', 'nodeShared'], 3, 0)

    const after = usePatternStore.getState().pattern
    expect(after.nodes.find((n) => n.id === 'nodeA')!.x).toBe(3)
    expect(after.nodes.find((n) => n.id === 'nodeShared')!.x).toBe(3)
    // nodeC was never in the moved set, so it must not have moved —
    // stitch B deforms (new angle to nodeShared) but nodeC itself is fixed.
    expect(after.nodes.find((n) => n.id === 'nodeC')!.x).toBe(0)
  })

  it('deleting the selection prunes nodes that no longer belong to any stitch', () => {
    const { beginPaletteDrag, endPaletteDrag, deleteSelectedStitches } =
      usePatternStore.getState()
    beginPaletteDrag('single', undefined, 72, 72)
    endPaletteDrag() // selection is now this one stitch

    expect(usePatternStore.getState().pattern.stitches).toHaveLength(1)
    deleteSelectedStitches()
    const after = usePatternStore.getState().pattern
    expect(after.stitches).toHaveLength(0)
    expect(after.nodes).toHaveLength(0)
    expect(usePatternStore.getState().selectedStitchIds).toHaveLength(0)
  })

  it('resizes the pattern bounds without touching existing stitches', () => {
    const { beginPaletteDrag, endPaletteDrag, resizePattern } =
      usePatternStore.getState()
    beginPaletteDrag('single', undefined, 72, 72)
    endPaletteDrag()
    resizePattern(5, 5)

    const state = usePatternStore.getState()
    expect(state.pattern.rows).toBe(5)
    expect(state.pattern.cols).toBe(5)
    expect(state.pattern.stitches).toHaveLength(1)
  })

  it('clamps zoom to the allowed range', () => {
    usePatternStore.getState().setZoom(10)
    expect(usePatternStore.getState().zoom).toBe(3)
    usePatternStore.getState().setZoom(-5)
    expect(usePatternStore.getState().zoom).toBe(0.5)
  })
})
