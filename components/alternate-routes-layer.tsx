'use client'

import { Fragment, useState } from 'react'
import { Polyline, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import type { RouteCandidate } from '@/lib/types'
import { RoutePreviewTooltip } from '@/components/route-preview-tooltip'

export type AlternateRoute = {
  candidate: RouteCandidate
  index: number
  color?: string
  isDirect?: boolean
}

type Props = {
  routes: AlternateRoute[]
  reference: RouteCandidate
  userSpeedKmh: number
  mapPickActive: boolean
  onSelect: (index: number) => void
}

export function AlternateRoutesLayer({
  routes,
  reference,
  userSpeedKmh,
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
      {routes.map(({ candidate, index, color, isDirect }) => {
        const hovered = hoveredIndex === index
        const events = handlers(index)
        const lineColor = color ?? (isDirect ? '#dc2626' : '#7c3aed')

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
                color: lineColor,
                weight: hovered ? 8 : isDirect ? 6 : 5,
                opacity: hovered ? 0.9 : isDirect ? 0.8 : 0.55,
                dashArray: isDirect ? '10 8' : undefined,
                lineJoin: 'round',
                lineCap: 'round',
              }}
              eventHandlers={events}
            >
              {hovered && !mapPickActive ? (
                <Tooltip sticky permanent direction="top" className="route-preview-tooltip">
                  <RoutePreviewTooltip
                    route={candidate}
                    reference={reference}
                    userSpeedKmh={userSpeedKmh}
                  />
                </Tooltip>
              ) : null}
            </Polyline>
          </Fragment>
        )
      })}
    </>
  )
}
