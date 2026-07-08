'use client'

import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import {
  drawGridLinesInView,
  MIN_GRID_CELL_PX,
} from '@/lib/coverage-grid'
import { tileLatStep } from '@/lib/geo'

type Props = {
  gridColor: string
}

/** Viewport 100 m grid over Mazowieckie. */
export function PlayingFieldGridLayer({ gridColor }: Props) {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    const canvas = document.createElement('canvas')
    canvas.className = 'leaflet-coverage-grid pointer-events-none'
    canvas.style.position = 'absolute'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.zIndex = '350'
    container.appendChild(canvas)

    const redraw = () => {
      const size = map.getSize()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.floor(size.x * dpr)
      canvas.height = Math.floor(size.y * dpr)
      canvas.style.width = `${size.x}px`
      canvas.style.height = `${size.y}px`

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size.x, size.y)

      const bounds = map.getBounds()
      const centerLat = (bounds.getNorth() + bounds.getSouth()) / 2
      const latStep = tileLatStep()
      const cellTop = map.latLngToContainerPoint([centerLat + latStep / 2, bounds.getWest()])
      const cellBottom = map.latLngToContainerPoint([
        centerLat - latStep / 2,
        bounds.getWest(),
      ])
      const cellPx = Math.abs(cellBottom.y - cellTop.y)
      if (cellPx < MIN_GRID_CELL_PX) return

      ctx.setLineDash([])
      ctx.lineWidth = 1.75
      ctx.strokeStyle = gridColor
      ctx.globalAlpha = 0.9
      ctx.beginPath()

      const segments = drawGridLinesInView(
        {
          south: bounds.getSouth(),
          north: bounds.getNorth(),
          west: bounds.getWest(),
          east: bounds.getEast(),
        },
        {
          horizontal: (lat, west, east) => {
            const left = map.latLngToContainerPoint([lat, west])
            const right = map.latLngToContainerPoint([lat, east])
            ctx.moveTo(left.x, left.y)
            ctx.lineTo(right.x, right.y)
          },
          vertical: (lng, south, north) => {
            const top = map.latLngToContainerPoint([north, lng])
            const bottom = map.latLngToContainerPoint([south, lng])
            ctx.moveTo(top.x, top.y)
            ctx.lineTo(bottom.x, bottom.y)
          },
        },
      )

      if (segments > 0) {
        ctx.stroke()
      }
    }

    map.on('move zoom resize viewreset', redraw)
    redraw()

    return () => {
      map.off('move zoom resize viewreset', redraw)
      canvas.remove()
    }
  }, [map, gridColor])

  return null
}
