import {
  COVERAGE_BBOX,
  COVERAGE_GRID_ORIGIN,
  gridColCount,
  gridRowCount,
  tileLatStep,
  tileLngStep,
} from '@/lib/geo'
import { formatTileKey } from '@/lib/tile-keys'
import type { LatLng } from '@/lib/types'

export { COVERAGE_GRID_ORIGIN }

export type GridCellIndex = { tx: number; ty: number }

export type GridCellBounds = {
  tx: number
  ty: number
  key: string
  south: number
  west: number
  north: number
  east: number
}

/** Skip drawing when cells are smaller than this on screen (px). */
export const MIN_GRID_CELL_PX = 4

/** Safety cap for line segments drawn per frame. */
export const MAX_GRID_LINE_SEGMENTS = 60_000

export type GridViewBounds = {
  south: number
  north: number
  west: number
  east: number
}

/** South-west and north-east corners for a square tile index. */
export function cellBoundsForIndex(tx: number, ty: number): GridCellBounds {
  const latStep = tileLatStep()
  const lngStep = tileLngStep(ty)
  const south = COVERAGE_GRID_ORIGIN.lat + ty * latStep
  const west = COVERAGE_GRID_ORIGIN.lng + tx * lngStep
  const north = Math.min(south + latStep, COVERAGE_BBOX.north)
  const east = Math.min(west + lngStep, COVERAGE_BBOX.east)
  return {
    tx,
    ty,
    key: formatTileKey(tx, ty),
    south,
    west,
    north,
    east,
  }
}

/** NW, NE, SE, SW corners in lat/lng for drawing a cell polygon. */
export function cellCorners(cell: GridCellBounds): [number, number][] {
  return [
    [cell.north, cell.west],
    [cell.north, cell.east],
    [cell.south, cell.east],
    [cell.south, cell.west],
  ]
}

function clipViewToCoverage(view: GridViewBounds): GridViewBounds | null {
  const south = Math.max(view.south, COVERAGE_BBOX.south)
  const north = Math.min(view.north, COVERAGE_BBOX.north)
  const west = Math.max(view.west, COVERAGE_BBOX.west)
  const east = Math.min(view.east, COVERAGE_BBOX.east)
  if (south >= north || west >= east) return null
  return { south, north, west, east }
}

function gridRowRange(
  south: number,
  north: number,
): { tyStart: number; tyEnd: number } {
  const latStep = tileLatStep()
  const rows = gridRowCount()
  const tyStart = Math.max(
    0,
    Math.floor((south - COVERAGE_GRID_ORIGIN.lat) / latStep),
  )
  const tyEnd = Math.min(
    rows - 1,
    Math.ceil((north - COVERAGE_GRID_ORIGIN.lat) / latStep),
  )
  return { tyStart, tyEnd }
}

/** Tile indices visible inside a map view, clipped to Mazowieckie. */
export function visibleGridCells(
  view: GridViewBounds & { maxCells?: number },
): GridCellBounds[] {
  const maxCells = view.maxCells ?? 12_000
  const clipped = clipViewToCoverage(view)
  if (!clipped) return []

  const { south, north, west, east } = clipped
  const rows = gridRowCount()
  const { tyStart, tyEnd } = gridRowRange(south, north)

  const cells: GridCellBounds[] = []
  for (let ty = tyStart; ty <= tyEnd; ty++) {
    if (ty < 0 || ty >= rows) continue

    const lngStep = tileLngStep(ty)
    const cols = gridColCount(ty)
    const txStart = Math.floor((west - COVERAGE_GRID_ORIGIN.lng) / lngStep)
    const txEnd = Math.ceil((east - COVERAGE_GRID_ORIGIN.lng) / lngStep)

    for (let tx = txStart; tx <= txEnd; tx++) {
      if (tx < 0 || tx >= cols) continue
      const cell = cellBoundsForIndex(tx, ty)
      if (cell.north < south || cell.south > north) continue
      if (cell.east < west || cell.west > east) continue
      cells.push(cell)
      if (cells.length > maxCells) return []
    }
  }
  return cells
}

type GridLineDraw = {
  horizontal: (lat: number, west: number, east: number) => void
  vertical: (lng: number, south: number, north: number) => void
}

/**
 * Draw grid lines for the viewport (O(rows + cols), not O(cells)).
 * Returns segment count; returns -1 when over MAX_GRID_LINE_SEGMENTS.
 */
export function drawGridLinesInView(
  view: GridViewBounds,
  draw: GridLineDraw,
): number {
  const clipped = clipViewToCoverage(view)
  if (!clipped) return 0

  const { south, north, west, east } = clipped
  const latStep = tileLatStep()
  const { tyStart, tyEnd } = gridRowRange(south, north)
  let count = 0

  for (let ty = tyStart; ty <= tyEnd + 1; ty++) {
    const lat = Math.min(
      COVERAGE_GRID_ORIGIN.lat + ty * latStep,
      COVERAGE_BBOX.north,
    )
    if (lat < south || lat > north) continue
    draw.horizontal(lat, west, east)
    count++
    if (count > MAX_GRID_LINE_SEGMENTS) return -1
  }

  for (let ty = tyStart; ty <= tyEnd; ty++) {
    const rowSouth = COVERAGE_GRID_ORIGIN.lat + ty * latStep
    const rowNorth = Math.min(rowSouth + latStep, COVERAGE_BBOX.north)
    if (rowNorth < south || rowSouth > north) continue

    const lngStep = tileLngStep(ty)
    const cols = gridColCount(ty)
    const txStart = Math.floor((west - COVERAGE_GRID_ORIGIN.lng) / lngStep)
    const txEnd = Math.ceil((east - COVERAGE_GRID_ORIGIN.lng) / lngStep)

    for (let tx = txStart; tx <= txEnd + 1; tx++) {
      if (tx < 0 || tx > cols) continue
      const lng = COVERAGE_GRID_ORIGIN.lng + tx * lngStep
      if (lng < west || lng > east) continue
      const segSouth = Math.max(rowSouth, south)
      const segNorth = Math.min(rowNorth, north)
      draw.vertical(lng, segSouth, segNorth)
      count++
      if (count > MAX_GRID_LINE_SEGMENTS) return -1
    }
  }

  return count
}
