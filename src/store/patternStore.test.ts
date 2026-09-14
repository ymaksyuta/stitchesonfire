import { beforeEach, describe, expect, it } from 'vitest'
import { usePatternStore } from './patternStore'
import type { Pattern } from '../types/pattern'

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
    activeStitch: 'single',
    activeColor: undefined,
    zoom: 1,
    showGuides: true,
    selectedStitchIds: [],
    activeTool: null,
    dragPreview: null,
    lastMoveTarget: null,
  })
  usePatternStore.getState().registerCanvas(fakeCanvas)
})

describe('placing stitches', () => {
  it('places a stitch by dragging from the palette, snapped to the guideline grid', () => {
    const { beginPaletteDrag, endPaletteDrag } = usePatternStore.getState()
    beginPaletteDrag('single', '#b45309', 73, 71) // cellSize 36 -> close to grid (2,2)
    endPaletteDrag()

    const { pattern, selectedStitchIds } = usePatternStore.getState()
    expect(pattern.stitches).toHaveLength(1)
    const stitch = pattern.stitches[0]
    expect(stitch.type).toBe('single')
    expect(stitch.color).toBe('#b45309')
    expect(stitch.pos.x).toBeCloseTo(2)
    expect(stitch.pos.y).toBeCloseTo(2)
    expect(pattern.sequence).toEqual([stitch.id])
    expect(selectedStitchIds).toEqual([stitch.id])
  })

  it('does not place anything when the drop lands outside the canvas', () => {
    const { beginPaletteDrag, endPaletteDrag } = usePatternStore.getState()
    beginPaletteDrag('single', undefined, -50, -50)
    endPaletteDrag()
    expect(usePatternStore.getState().pattern.stitches).toHaveLength(0)
  })

  it('inserts a new stitch right after the current one in sequence', () => {
    const { beginPaletteDrag, endPaletteDrag } = usePatternStore.getState()
    beginPaletteDrag('single', undefined, 36, 36) // (1,1), becomes current
    endPaletteDrag()
    const first = usePatternStore.getState().pattern.stitches[0]

    beginPaletteDrag('single', undefined, 180, 180) // far away (5,5)
    endPaletteDrag()
    const { pattern } = usePatternStore.getState()
    expect(pattern.sequence).toEqual([first.id, pattern.stitches[1].id])
  })

  it('inserting between two stitches splices into the middle of the sequence', () => {
    const { beginPaletteDrag, endPaletteDrag, selectOnly } = usePatternStore.getState()
    beginPaletteDrag('single', undefined, 36, 36)
    endPaletteDrag()
    const a = usePatternStore.getState().pattern.stitches[0]
    beginPaletteDrag('single', undefined, 180, 180)
    endPaletteDrag()
    const b = usePatternStore.getState().pattern.stitches[1]

    selectOnly(a.id) // make "a" current again
    beginPaletteDrag('single', undefined, 108, 108) // (3,3)
    endPaletteDrag()
    const c = usePatternStore.getState().pattern.stitches[2]

    expect(usePatternStore.getState().pattern.sequence).toEqual([a.id, c.id, b.id])
  })
})

describe('Add tool sweep', () => {
  it('sweeping over empty guideline points inserts a chain of stitches', () => {
    const { setActiveTool, applyAddAt } = usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(1, 1)
    applyAddAt(2, 1)
    applyAddAt(3, 1)

    const { pattern } = usePatternStore.getState()
    expect(pattern.stitches).toHaveLength(3)
    expect(pattern.sequence).toHaveLength(3)
    expect(pattern.stitches.map((s) => s.pos)).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 3, y: 1 },
    ])
  })

  it('sweeping over an existing stitch retypes it instead of duplicating', () => {
    const { setActiveTool, applyAddAt } = usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(2, 2)
    usePatternStore.setState({ activeStitch: 'double', activeColor: '#166534' })
    applyAddAt(2, 2)

    const { pattern } = usePatternStore.getState()
    expect(pattern.stitches).toHaveLength(1)
    expect(pattern.stitches[0].type).toBe('double')
    expect(pattern.stitches[0].color).toBe('#166534')
  })
})

describe('attachments', () => {
  it('dragging an attachment handle onto another stitch hooks into it', () => {
    const { setActiveTool, applyAddAt, commitAttachmentDrag } = usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(2, 4) // base row
    applyAddAt(2, 2) // the stitch that will attach upward

    const { pattern } = usePatternStore.getState()
    const base = pattern.stitches[0]
    const top = pattern.stitches[1]
    expect(top.attachments).toEqual([null])

    commitAttachmentDrag(top.id, 0, base.pos.x, base.pos.y)
    expect(usePatternStore.getState().pattern.stitches[1].attachments).toEqual([base.id])
  })

  it('dropping an attachment drag on empty space detaches it', () => {
    const { setActiveTool, applyAddAt, commitAttachmentDrag } = usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(2, 4)
    applyAddAt(2, 2)
    const { pattern } = usePatternStore.getState()
    const base = pattern.stitches[0]
    const top = pattern.stitches[1]
    commitAttachmentDrag(top.id, 0, base.pos.x, base.pos.y)
    expect(usePatternStore.getState().pattern.stitches[1].attachments).toEqual([base.id])

    commitAttachmentDrag(top.id, 0, 9, 9) // far from anything
    expect(usePatternStore.getState().pattern.stitches[1].attachments).toEqual([null])
  })

  it('two stitches attaching to the same target form a fan', () => {
    const { setActiveTool, applyAddAt, commitAttachmentDrag } = usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(2, 4) // shared base
    applyAddAt(1, 2)
    applyAddAt(3, 2)
    const { pattern } = usePatternStore.getState()
    const [base, leftLeg, rightLeg] = pattern.stitches

    commitAttachmentDrag(leftLeg.id, 0, base.pos.x, base.pos.y)
    commitAttachmentDrag(rightLeg.id, 0, base.pos.x, base.pos.y)

    const after = usePatternStore.getState().pattern
    expect(after.stitches[1].attachments[0]).toBe(base.id)
    expect(after.stitches[2].attachments[0]).toBe(base.id)
  })
})

describe('deleting', () => {
  it('sweeping the delete tool over a stitch removes it', () => {
    const { setActiveTool, applyAddAt, applyDeleteAt } = usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(2, 2)

    setActiveTool('delete')
    applyDeleteAt(2, 2)

    expect(usePatternStore.getState().pattern.stitches).toHaveLength(0)
    expect(usePatternStore.getState().pattern.sequence).toHaveLength(0)
  })

  it('deleting a stitch detaches anything that was hooked into it', () => {
    const { setActiveTool, applyAddAt, commitAttachmentDrag, applyDeleteAt } =
      usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(2, 4)
    applyAddAt(2, 2)
    const { pattern } = usePatternStore.getState()
    const base = pattern.stitches[0]
    const top = pattern.stitches[1]
    commitAttachmentDrag(top.id, 0, base.pos.x, base.pos.y)

    setActiveTool('delete')
    applyDeleteAt(base.pos.x, base.pos.y)

    const after = usePatternStore.getState().pattern
    expect(after.stitches).toHaveLength(1)
    expect(after.stitches[0].attachments).toEqual([null])
  })
})

describe('geometric move (no cascade)', () => {
  it('moving a stitch does not move whatever it is attached to', () => {
    const { setActiveTool, applyAddAt, commitAttachmentDrag, moveStitchesBy } =
      usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(2, 4)
    applyAddAt(2, 2)
    const { pattern } = usePatternStore.getState()
    const base = pattern.stitches[0]
    const top = pattern.stitches[1]
    commitAttachmentDrag(top.id, 0, base.pos.x, base.pos.y)

    moveStitchesBy([top.id], 3, 0)

    const after = usePatternStore.getState().pattern
    expect(after.stitches.find((s) => s.id === top.id)!.pos.x).toBe(5)
    // The base never moved — the leg just deforms on render, it doesn't drag the base along.
    expect(after.stitches.find((s) => s.id === base.id)!.pos).toEqual(base.pos)
  })
})

describe('move-in-sequence tool', () => {
  it('moves the selection to right after the swept target', () => {
    const { setActiveTool, applyAddAt, selectOnly, noteMoveTarget, commitMoveSweep } =
      usePatternStore.getState()
    setActiveTool('add')
    applyAddAt(1, 1)
    applyAddAt(2, 1)
    applyAddAt(3, 1)
    const [a, b, c] = usePatternStore.getState().pattern.stitches

    selectOnly(a.id) // "a" is current/selected
    setActiveTool('move')
    noteMoveTarget(c.pos.x, c.pos.y) // sweep touches "c"
    commitMoveSweep()

    expect(usePatternStore.getState().pattern.sequence).toEqual([b.id, c.id, a.id])
  })
})

describe('undo/redo', () => {
  it('undoes a single insert', () => {
    const { beginPaletteDrag, endPaletteDrag, undo } = usePatternStore.getState()
    beginPaletteDrag('single', undefined, 72, 72)
    endPaletteDrag()
    expect(usePatternStore.getState().pattern.stitches).toHaveLength(1)

    undo()
    expect(usePatternStore.getState().pattern.stitches).toHaveLength(0)
  })

  it('redo restores what undo removed', () => {
    const { beginPaletteDrag, endPaletteDrag, undo, redo } = usePatternStore.getState()
    beginPaletteDrag('single', undefined, 72, 72)
    endPaletteDrag()
    const id = usePatternStore.getState().pattern.stitches[0].id

    undo()
    expect(usePatternStore.getState().pattern.stitches).toHaveLength(0)
    redo()
    expect(usePatternStore.getState().pattern.stitches[0].id).toBe(id)
  })

  it('a whole sweep gesture undoes as a single step', () => {
    const { setActiveTool, beginGesture, applyAddAt, undo } = usePatternStore.getState()
    setActiveTool('add')
    beginGesture() // gesture-start snapshot, as StitchGrid's pointerdown would do
    applyAddAt(1, 1)
    applyAddAt(2, 1)
    applyAddAt(3, 1)
    expect(usePatternStore.getState().pattern.stitches).toHaveLength(3)

    undo()
    expect(usePatternStore.getState().pattern.stitches).toHaveLength(0)
  })

  it('a new action after undo clears the redo stack', () => {
    const { beginPaletteDrag, endPaletteDrag, undo, redo } = usePatternStore.getState()
    beginPaletteDrag('single', undefined, 72, 72)
    endPaletteDrag()
    undo()
    beginPaletteDrag('single', undefined, 108, 108)
    endPaletteDrag()

    expect(usePatternStore.getState().history.future).toHaveLength(0)
    redo() // no-op, nothing to redo
    expect(usePatternStore.getState().pattern.stitches).toHaveLength(1)
  })
})

describe('resize and rename', () => {
  it('resizes pattern bounds without touching stitches', () => {
    const { beginPaletteDrag, endPaletteDrag, resizePattern } = usePatternStore.getState()
    beginPaletteDrag('single', undefined, 72, 72)
    endPaletteDrag()
    resizePattern(5, 5)

    const state = usePatternStore.getState()
    expect(state.pattern.rows).toBe(5)
    expect(state.pattern.cols).toBe(5)
    expect(state.pattern.stitches).toHaveLength(1)
  })

  it('normalizes a pattern saved before this rewrite instead of crashing', () => {
    const legacy = {
      id: 'old',
      name: 'legacy',
      rows: 10,
      cols: 10,
      createdAt: 0,
      updatedAt: 0,
    } as unknown as Pattern
    usePatternStore.getState().loadPattern(legacy)
    const { pattern } = usePatternStore.getState()
    expect(pattern.stitches).toEqual([])
    expect(pattern.sequence).toEqual([])
  })
})

describe('zoom', () => {
  it('clamps to the allowed range', () => {
    usePatternStore.getState().setZoom(10)
    expect(usePatternStore.getState().zoom).toBe(3)
    usePatternStore.getState().setZoom(-5)
    expect(usePatternStore.getState().zoom).toBe(0.5)
  })
})
