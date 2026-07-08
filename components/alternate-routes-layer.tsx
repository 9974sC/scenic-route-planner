'use client'

import { useState } from 'react'
import { Polyline, Tooltip, useMapEvents } from 'react-leaflet'
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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  useMapEvents({
    click() {
      setHoveredIndex(null)
    },
  })

  return (
    <>
      {routes.map(({ candidate, index, color }) => {
        const hovered = hoveredIndex === index
        return (
          <Polyline
            key={candidate.id}
            positions={candidate.coords}
            pathOptions={{
              color: color ?? '#7c3aed',
              weight: hovered ? 7 : 5,
              opacity: hovered ? 0.85 : 0.55,
              lineJoin: 'round',
              lineCap: 'round',
            }}
            eventHandlers={{
              mouseover: () => {
                if (!mapPickActive) setHoveredIndex(index)
              },
              mouseout: () => {
                setHoveredIndex((current) => (current === index ? null : current))
              },
              click: (e) => {
                if (mapPickActive) return
                e.originalEvent.stopPropagation()
                onSelect(index)
                setHoveredIndex(null)
              },
            }}
          >
            {hovered && !mapPickActive ? (
              <Tooltip sticky permanent direction="top" className="route-preview-tooltip">
                <RoutePreviewTooltip route={candidate} direct={direct} />
              </Tooltip>
            ) : null}
          </Polyline>
        )
      })}
    </>
  )
}
