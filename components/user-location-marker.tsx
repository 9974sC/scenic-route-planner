'use client'

import { Marker, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng } from '@/lib/types'

const ICON_CACHE = new Map<string, L.DivIcon>()

function userLocationIcon(active: boolean, following: boolean): L.DivIcon {
  const key = active ? 'active' : following ? 'following' : 'idle'
  const cached = ICON_CACHE.get(key)
  if (cached) return cached

  const size = 20
  const classes = [
    'user-location-marker',
    active ? 'user-location-marker--active' : '',
    following ? 'user-location-marker--following' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const icon = L.divIcon({
    className: 'user-location-leaflet-icon',
    html: `<div class="${classes}" style="width:${size}px;height:${size}px"><span class="user-location-dot"></span><span class="user-location-pulse"></span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
  ICON_CACHE.set(key, icon)
  return icon
}

type Props = {
  position: LatLng
  isStart?: boolean
  following?: boolean
  onSelectAsStart?: () => void
}

export function UserLocationMarker({
  position,
  isStart = false,
  following = false,
  onSelectAsStart,
}: Props) {
  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={userLocationIcon(isStart, following && !isStart)}
      zIndexOffset={700}
      interactive={Boolean(onSelectAsStart)}
      eventHandlers={
        onSelectAsStart
          ? {
              click: (e) => {
                L.DomEvent.stopPropagation(e)
                onSelectAsStart()
              },
            }
          : undefined
      }
    >
      <Tooltip
        direction="top"
        offset={[0, -12]}
        opacity={0.96}
        sticky
        className="turn-marker-tooltip"
      >
        {isStart ? 'Your location (start)' : 'Your location — tap to set as start'}
      </Tooltip>
    </Marker>
  )
}
