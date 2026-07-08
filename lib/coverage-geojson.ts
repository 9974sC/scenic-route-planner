import { cellBoundsForIndex } from '@/lib/coverage-grid'
import { gridColCount, gridRowCount } from '@/lib/geo'
import { parseTileKeyCoords } from '@/lib/tile-keys'

export type TilePolygonFeature = {
  type: 'Feature'
  properties: { key: string; color?: string }
  geometry: {
    type: 'Polygon'
    coordinates: [number, number][][]
  }
}

export type TileFeatureCollection = {
  type: 'FeatureCollection'
  features: TilePolygonFeature[]
}

function cellToFeature(
  cell: ReturnType<typeof cellBoundsForIndex>,
  color?: string,
): TilePolygonFeature {
  return {
    type: 'Feature',
    properties: { key: cell.key, ...(color ? { color } : {}) },
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [cell.west, cell.south],
          [cell.east, cell.south],
          [cell.east, cell.north],
          [cell.west, cell.north],
          [cell.west, cell.south],
        ],
      ],
    },
  }
}

export function buildPlayingFieldGeoJson(): TileFeatureCollection {
  const features: TilePolygonFeature[] = []
  const rows = gridRowCount()

  for (let ty = 0; ty < rows; ty++) {
    const cols = gridColCount(ty)
    for (let tx = 0; tx < cols; tx++) {
      features.push(cellToFeature(cellBoundsForIndex(tx, ty)))
    }
  }

  return { type: 'FeatureCollection', features }
}

export function buildCoveredTilesGeoJson(
  keys: string[],
  color?: string,
): TileFeatureCollection {
  const features: TilePolygonFeature[] = []
  const seen = new Set<string>()

  for (const key of keys) {
    if (seen.has(key)) continue
    const parsed = parseTileKeyCoords(key)
    if (!parsed) continue
    seen.add(key)
    features.push(cellToFeature(cellBoundsForIndex(parsed.tx, parsed.ty), color))
  }

  return { type: 'FeatureCollection', features }
}
