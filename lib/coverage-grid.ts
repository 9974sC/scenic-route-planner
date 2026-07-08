import {
  COVERAGE_GRID_ORIGIN,
  WARSAW_BBOX,
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

/** South-west and north-east corners for a square tile index. */
export function cellBoundsForIndex(tx: number, ty: number): GridCellBounds {
  const latStep = tileLatStep()
  const lngStep = tileLngStep(ty)
  const south = COVERAGE_GRID_ORIGIN.lat + ty * latStep
  const west = COVERAGE_GRID_ORIGIN.lng + tx * lngStep
  const north = Math.min(south + latStep, WARSAW_BBOX.north)
  const east = Math.min(west + lngStep, WARSAW_BBOX.east)
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

  const rows = gridRowCount()
  const latStep = tileLatStep()
  const tyStart = Math.floor((south - COVERAGE_GRID_ORIGIN.lat) / latStep)
  const tyEnd = Math.ceil((north - COVERAGE_GRID_ORIGIN.lat) / latStep)

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
    }
  }
  return cells
}
