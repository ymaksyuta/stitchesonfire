import { beforeEach, describe, expect, it } from 'vitest'
import { usePatternStore } from './patternStore'

beforeEach(() => {
  usePatternStore.getState().reset(10, 10)
  usePatternStore.setState({ activeColor: undefined, zoom: 1 })
})

describe('patternStore', () => {
  it('places a stitch with the active color', () => {
    usePatternStore.getState().setActiveColor('#b45309')
    usePatternStore.getState().placeStitch(2, 3)
    const cell = usePatternStore
      .getState()
      .pattern.cells.find((c) => c.row === 2 && c.col === 3)
    expect(cell?.color).toBe('#b45309')
  })

  it('stretches a cell and clears anything it now overlaps', () => {
    const { placeStitch, stretchCell } = usePatternStore.getState()
    placeStitch(0, 0)
    placeStitch(0, 1)
    stretchCell({ row: 0, col: 0 }, 1, 2)

    const cells = usePatternStore.getState().pattern.cells
    expect(cells).toHaveLength(1)
    expect(cells[0]).toMatchObject({ row: 0, col: 0, colSpan: 2, rowSpan: 1 })
  })

  it('clamps a stretch to the grid bounds', () => {
    const { placeStitch, stretchCell } = usePatternStore.getState()
    placeStitch(9, 9)
    stretchCell({ row: 9, col: 9 }, 5, 5)
    const cell = usePatternStore.getState().pattern.cells[0]
    expect(cell.rowSpan).toBe(1)
    expect(cell.colSpan).toBe(1)
  })

  it('resizes the pattern and drops stitches that no longer fit', () => {
    const { placeStitch, resizePattern } = usePatternStore.getState()
    placeStitch(1, 1)
    placeStitch(8, 8)
    resizePattern(5, 5)

    const state = usePatternStore.getState()
    expect(state.pattern.rows).toBe(5)
    expect(state.pattern.cols).toBe(5)
    expect(state.pattern.cells).toHaveLength(1)
    expect(state.pattern.cells[0]).toMatchObject({ row: 1, col: 1 })
  })

  it('clamps zoom to the allowed range', () => {
    usePatternStore.getState().setZoom(10)
    expect(usePatternStore.getState().zoom).toBe(3)
    usePatternStore.getState().setZoom(-5)
    expect(usePatternStore.getState().zoom).toBe(0.5)
  })
})
