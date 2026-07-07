'use client'

import { createElement, useMemo, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Marker, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import type { TurnMarker } from '@/lib/types'
import {
  filterTurnMarkersByZoom,
  markerScaleForZoom,
} from '@/lib/turn-markers'
import { iconForTurnSign } from '@/components/turn-icon'

const ICON_CACHE = new Map<string, L.DivIcon>()

function turnMarkerIcon(
  sign: number,
  color: string,
  scale: number,
): L.DivIcon {
  const key = `${sign}:${color}:${scale}`
  const cached = ICON_CACHE.get(key)
  if (cached) return cached

  const size = Math.round(22 * scale)
  const iconPx = Math.round(12 * scale)
  const Icon = iconForTurnSign(sign)
  const svg = renderToStaticMarkup(
    createElement(Icon, {
      size: iconPx,
      color,
      strokeWidth: 2.5,
      'aria-hidden': true,
    }),
  )

  const icon = L.divIcon({
    className: 'turn-marker-leaflet-icon',
    html: `<div class="turn-marker-badge" style="width:${size}px;height:${size}px">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

  ICON_CACHE.set(key, icon)
  return icon
}

type Props = {
  markers: TurnMarker[]
  color?: string
}

export function TurnMarkersLayer({
  markers,
  color = '#3f7d4f',
}: Props) {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom())

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  const visible = useMemo(
    () => filterTurnMarkersByZoom(markers, zoom),
    [markers, zoom],
  )
  const scale = markerScaleForZoom(zoom)

  if (!visible.length) return null

  return (
    <>
      {visible.map((marker, i) => (
        <Marker
          key={`${marker.pointIndex}-${marker.sign}-${i}`}
          position={[marker.lat, marker.lng]}
          icon={turnMarkerIcon(marker.sign, color, scale)}
          zIndexOffset={450}
          interactive
        >
          <Tooltip
            direction="top"
            offset={[0, -10]}
            opacity={0.96}
            sticky
            className="turn-marker-tooltip"
          >
            {marker.text}
          </Tooltip>
        </Marker>
      ))}
    </>
  )
}
