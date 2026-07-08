'use client'

import { Fragment, useState } from 'react'
import { Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { RouteCandidate } from '@/lib/types'
import { RoutePreviewTooltip } from '@/components/route-preview-tooltip'

export type AlternateRoute = {
  candidate: RouteCandidate
  index: number
  color?: string
}

type Props = {
  routes: AlternateRoute[]
  direct: RouteCandidate
  mapPickActive: boolean
  onSelect: (index: number) => void
}

export function AlternateRoutesLayer({
  routes,
  direct,
  mapPickActive,
  onSelect,
}: Props) {
  const map = useMap()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useMapEvents({
    click() {
      setHoveredIndex(null)
    },
  })

  const setRouteCursor = (active: boolean) => {
    map.getContainer().style.cursor = active ? 'pointer' : ''
  }

  const handlers = (index: number) => ({
    mouseover: () => {
      if (mapPickActive) return
      setHoveredIndex(index)
      setRouteCursor(true)
    },
    mouseout: () => {
      setHoveredIndex((current) => (current === index ? null : current))
      setRouteCursor(false)
    },
    click: (e: { originalEvent: Event }) => {
      if (mapPickActive) return
      e.originalEvent.stopPropagation()
      onSelect(index)
      setHoveredIndex(null)
      setRouteCursor(false)
    },
  })

  return (
    <>
      {routes.map(({ candidate, index, color }) => {
        const hovered = hoveredIndex === index
        const events = handlers(index)

        return (
          <Fragment key={candidate.id}>
            <Polyline
              positions={candidate.coords}
              pathOptions={{
                color: '#000000',
                weight: 14,
                opacity: 0,
              }}
              eventHandlers={events}
            />
            <Polyline
              positions={candidate.coords}
              pathOptions={{
                color: color ?? '#7c3aed',
                weight: hovered ? 7 : 5,
                opacity: hovered ? 0.85 : 0.55,
                lineJoin: 'round',
                lineCap: 'round',
              }}
              eventHandlers={events}
            >
              {hovered && !mapPickActive ? (
                <Tooltip sticky permanent direction="top" className="route-preview-tooltip">
                  <RoutePreviewTooltip route={candidate} direct={direct} />
                </Tooltip>
              ) : null}
            </Polyline>
          </Fragment>
        )
      })}
    </>
  )
}
