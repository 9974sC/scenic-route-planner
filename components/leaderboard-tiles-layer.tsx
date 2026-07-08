'use client'

import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import { cellBoundsForIndex } from '@/lib/coverage-grid'
import type { TileFeatureCollection } from '@/lib/coverage-geojson'
import type { LeaderboardEntry } from '@/lib/leaderboard-types'
import { normalizeStoredTileKeys } from '@/lib/tile-migration'
import { parseTileKeyCoords } from '@/lib/tile-keys'

type Props = {
  entries: LeaderboardEntry[]
  gridColor: string
  fillOpacity?: number
}

function buildLeaderboardGeoJson(entries: LeaderboardEntry[]): TileFeatureCollection {
  const colorByTile = new Map<string, string>()
  const ranked = [...entries]
    .filter((e) => e.tileKeys?.length)
    .sort((a, b) => b.rank - a.rank)

  for (const entry of ranked) {
    const keys = normalizeStoredTileKeys(entry.tileKeys ?? [])
    for (const key of keys) {
      colorByTile.set(key, entry.colorHex)
    }
  }

  const features: TileFeatureCollection['features'] = []

  for (const [key, color] of colorByTile.entries()) {
    const parsed = parseTileKeyCoords(key)
    if (!parsed) continue
    const cell = cellBoundsForIndex(parsed.tx, parsed.ty)
    features.push({
      type: 'Feature',
      properties: { key, color },
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
    })
  }

  return { type: 'FeatureCollection', features }
}

/** Multi-user coverage fills over the playing-field grid. */
export function LeaderboardTilesLayer({
  entries,
  gridColor,
  fillOpacity = 0.42,
}: Props) {
  const geojson = useMemo(() => buildLeaderboardGeoJson(entries), [entries])

  if (!geojson.features.length) return null

  return (
    <GeoJSON
      key={`leaderboard-tiles-${entries.length}-${geojson.features.length}`}
      data={geojson}
      style={(feature) => {
        const color =
          typeof feature?.properties?.color === 'string'
            ? feature.properties.color
            : '#64748b'
        return {
          color: gridColor,
          weight: 1,
          opacity: 0.35,
          dashArray: '5 4',
          fillColor: color,
          fillOpacity,
        }
      }}
      interactive={false}
    />
  )
}
