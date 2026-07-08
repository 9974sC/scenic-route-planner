'use client'

import { GeoJSON } from 'react-leaflet'
import { buildPlayingFieldGeoJson } from '@/lib/coverage-geojson'

const PLAYING_FIELD_GRID = buildPlayingFieldGeoJson()

type Props = {
  gridColor: string
}

/** Grey dashed grid covering the full Warsaw playing field. */
export function PlayingFieldGridLayer({ gridColor }: Props) {
  return (
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
  )
}
