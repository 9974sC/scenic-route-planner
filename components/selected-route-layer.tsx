'use client'

import { Fragment, useState } from 'react'
import { Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { RouteCandidate } from '@/lib/types'
import { RoutePreviewTooltip } from '@/components/route-preview-tooltip'

type Props = {
  route: RouteCandidate
  color: string
  userSpeedKmh: number
  mapPickActive: boolean
}

export function SelectedRouteLayer({
  route,
  color,
  userSpeedKmh,
  mapPickActive,
}: Props) {
  const map = useMap()
  const [hovered, setHovered] = useState(false)

  useMapEvents({
    click() {
      setHovered(false)
    },
  })

  const setRouteCursor = (active: boolean) => {
    map.getContainer().style.cursor = active ? 'pointer' : ''
  }

  const events = {
    mouseover: () => {
      if (mapPickActive) return
      setHovered(true)
      setRouteCursor(true)
    },
    mouseout: () => {
      setHovered(false)
      setRouteCursor(false)
    },
  }

  return (
    <Fragment>
      <Polyline
        positions={route.coords}
        pathOptions={{
          color: '#000000',
          weight: 16,
          opacity: 0,
        }}
        eventHandlers={events}
      />
      <Polyline
        positions={route.coords}
        pathOptions={{
          color,
          weight: hovered ? 12 : 10,
          opacity: hovered ? 1 : 0.95,
          lineJoin: 'round',
          lineCap: 'round',
        }}
        eventHandlers={events}
      >
        {hovered && !mapPickActive ? (
          <Tooltip sticky permanent direction="top" className="route-preview-tooltip">
            <RoutePreviewTooltip
              route={route}
              reference={route}
              userSpeedKmh={userSpeedKmh}
              showSelectHint={false}
            />
          </Tooltip>
        ) : null}
      </Polyline>
    </Fragment>
  )
}
