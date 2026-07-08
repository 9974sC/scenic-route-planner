'use client'

import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import { cellBoundsForIndex } from '@/lib/coverage-grid'
import { gridDimension } from '@/lib/geo'

type TilePolygonFeature = {
  type: 'Feature'
  properties: { key: string }
  geometry: {
    type: 'Polygon'
    coordinates: [number, number][][]
  }
}

type TileFeatureCollection = {
  type: 'FeatureCollection'
  features: TilePolygonFeature[]
}

type Props = {
  coveredKeys: string[]
  color: string
  gridColor: string
  fillOpacity?: number
}

function cellToFeature(cell: ReturnType<typeof cellBoundsForIndex>): TilePolygonFeature {
  return {
    type: 'Feature',
    properties: { key: cell.key },
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

function allPlayingFieldCellsGeoJson(): TileFeatureCollection {
  const n = gridDimension()
  const features: TilePolygonFeature[] = []

  for (let ty = 0; ty < n; ty++) {
    for (let tx = 0; tx < n; tx++) {
      features.push(cellToFeature(cellBoundsForIndex(tx, ty)))
    }
  }

  return { type: 'FeatureCollection', features }
}

function parseTileKey(key: string): { tx: number; ty: number } | null {
  const parts = key.split(':')
  if (parts.length !== 2) return null
  const tx = Number(parts[0])
  const ty = Number(parts[1])
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null
  return { tx, ty }
}

function coveredTilesGeoJson(keys: string[]): TileFeatureCollection {
  const features: TilePolygonFeature[] = []

  for (const key of keys) {
    const parsed = parseTileKey(key)
    if (!parsed) continue
    features.push(cellToFeature(cellBoundsForIndex(parsed.tx, parsed.ty)))
  }

  return { type: 'FeatureCollection', features }
}

const PLAYING_FIELD_GRID = allPlayingFieldCellsGeoJson()

/** Grey dashed grid with user-color fills on claimed tiles. */
export function CoveredTilesLayer({
  coveredKeys,
  color,
  gridColor,
  fillOpacity = 0.45,
}: Props) {
  const coveredGeojson = useMemo(
    () => coveredTilesGeoJson(coveredKeys),
    [coveredKeys],
  )

  const coveredLayerKey = useMemo(
    () =>
      `coverage-${coveredKeys.length}-${coveredKeys[0] ?? ''}-${coveredKeys[coveredKeys.length - 1] ?? ''}`,
    [coveredKeys],
  )

  return (
    <>
      <GeoJSON
        key="playing-field-grid"
        data={PLAYING_FIELD_GRID}
        style={{
          color: gridColor,
          weight: 1,
          opacity: 0.55,
          dashArray: '5 4',
          fill: false,
        }}
        interactive={false}
      />
      {coveredGeojson.features.length > 0 ? (
        <GeoJSON
          key={coveredLayerKey}
          data={coveredGeojson}
          style={{
            color: gridColor,
            weight: 1,
            opacity: 0.4,
            dashArray: '5 4',
            fillColor: color,
            fillOpacity,
          }}
          interactive={false}
        />
      ) : null}
    </>
  )
}
