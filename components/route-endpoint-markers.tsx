'use client'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import { CircleDot, Flag, type LucideIcon } from 'lucide-react'
import type { LatLng } from '@/lib/types'

const ICON_CACHE = new Map<string, L.DivIcon>()

function endpointIcon(
  Icon: LucideIcon,
  color: string,
  label: string,
  bgTint: string,
): L.DivIcon {
  const key = `${label}:${color}:${bgTint}`
  const cached = ICON_CACHE.get(key)
  if (cached) return cached

  const size = 36
  const iconPx = 20
  const svg = renderToStaticMarkup(
    createElement(Icon, {
      size: iconPx,
      color,
      strokeWidth: 2.5,
      'aria-hidden': true,
    }),
  )

  const icon = L.divIcon({
    className: 'endpoint-marker-leaflet-icon',
    html: `<div class="endpoint-marker-badge" style="width:${size}px;height:${size}px;background:${bgTint};border:2.5px solid ${color};box-shadow:0 0 0 2px #fff,0 3px 10px rgba(0,0,0,.22)" aria-label="${label}">${svg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })

  ICON_CACHE.set(key, icon)
  return icon
}

type Props = {
  start: LatLng
  end: LatLng
  startColor?: string
  finishColor?: string
  startBg?: string
  finishBg?: string
  /** Hide green start pin when start is the live location marker */
  hideStart?: boolean
}

export function RouteEndpointMarkers({
  start,
  end,
  startColor = '#16a34a',
  finishColor = '#ea580c',
  startBg = '#dcfce7',
  finishBg = '#ffedd5',
  hideStart = false,
}: Props) {
  return (
    <>
      {!hideStart ? (
        <Marker
          position={[start.lat, start.lng]}
          icon={endpointIcon(CircleDot, startColor, 'Start', startBg)}
          zIndexOffset={650}
          interactive
        >
          <Tooltip
            direction="top"
            offset={[0, -18]}
            opacity={0.96}
            sticky
            className="turn-marker-tooltip"
          >
            Start
          </Tooltip>
        </Marker>
      ) : null}
      <Marker
        position={[end.lat, end.lng]}
        icon={endpointIcon(Flag, finishColor, 'Finish', finishBg)}
        zIndexOffset={650}
        interactive
      >
        <Tooltip
          direction="top"
          offset={[0, -18]}
          opacity={0.96}
          sticky
          className="turn-marker-tooltip"
        >
          Finish
        </Tooltip>
      </Marker>
    </>
  )
}
