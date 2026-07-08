import { WARSAW_BBOX, TILE_SIZE } from '@/lib/geo'
import type { LatLng } from '@/lib/types'

/** Fixed geographic origin for the Warsaw coverage grid (south-west corner). */
export const COVERAGE_GRID_ORIGIN: LatLng = {
  lat: WARSAW_BBOX.south,
  lng: WARSAW_BBOX.west,
}

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

/** South-west and north-east corners for a tile index — fixed lat/lng. */
export function cellBoundsForIndex(tx: number, ty: number): GridCellBounds {
  const south = COVERAGE_GRID_ORIGIN.lat + ty * TILE_SIZE
  const west = COVERAGE_GRID_ORIGIN.lng + tx * TILE_SIZE
  return {
    tx,
    ty,
    key: `${tx}:${ty}`,
    south,
    west,
    north: south + TILE_SIZE,
    east: west + TILE_SIZE,
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

/** Tile indices visible inside a map view, clipped to the Warsaw playing field. */
export function visibleGridCells(view: {
  south: number
  north: number
  west: number
  east: number
}): GridCellBounds[] {
  const south = Math.max(view.south, WARSAW_BBOX.south)
  const north = Math.min(view.north, WARSAW_BBOX.north)
  const west = Math.max(view.west, WARSAW_BBOX.west)
  const east = Math.min(view.east, WARSAW_BBOX.east)
  if (south >= north || west >= east) return []

  const tyStart = Math.floor((south - COVERAGE_GRID_ORIGIN.lat) / TILE_SIZE)
  const tyEnd = Math.ceil((north - COVERAGE_GRID_ORIGIN.lat) / TILE_SIZE)
  const txStart = Math.floor((west - COVERAGE_GRID_ORIGIN.lng) / TILE_SIZE)
  const txEnd = Math.ceil((east - COVERAGE_GRID_ORIGIN.lng) / TILE_SIZE)

  const cells: GridCellBounds[] = []
  for (let ty = tyStart; ty <= tyEnd; ty++) {
    for (let tx = txStart; tx <= txEnd; tx++) {
      const cell = cellBoundsForIndex(tx, ty)
      if (cell.north < south || cell.south > north) continue
      if (cell.east < west || cell.west > east) continue
      cells.push(cell)
    }
  }
  return cells
}
