'use client'

import { useMemo } from 'react'
import { GeoJSON } from 'react-leaflet'
import { buildCoveredTilesGeoJson } from '@/lib/coverage-geojson'

type Props = {
  coveredKeys: string[]
  color: string
  gridColor: string
  fillOpacity?: number
}

/** User-color fills on claimed tiles (pair with PlayingFieldGridLayer). */
export function CoveredTilesLayer({
  coveredKeys,
  color,
  gridColor,
  fillOpacity = 0.45,
}: Props) {
  const coveredGeojson = useMemo(
    () => buildCoveredTilesGeoJson(coveredKeys, color),
    [coveredKeys, color],
  )

  const coveredLayerKey = useMemo(
    () =>
      `coverage-${coveredKeys.length}-${coveredKeys[0] ?? ''}-${coveredKeys[coveredKeys.length - 1] ?? ''}`,
    [coveredKeys],
  )

  if (!coveredGeojson.features.length) return null

  return (
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
  )
}
