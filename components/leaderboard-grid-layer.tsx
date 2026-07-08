'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useMap } from 'react-leaflet'
import { cellCorners, visibleGridCells } from '@/lib/coverage-grid'
import type { LeaderboardEntry } from '@/lib/leaderboard-types'

type Props = {
  visible: boolean
  entries: LeaderboardEntry[]
  lineOpacity?: number
}

/** Multi-user coverage fills — lower ranks drawn first, leaders on top. */
export function LeaderboardGridLayer({
  visible,
  entries,
  lineOpacity = 0.12,
}: Props) {
  const map = useMap()
  const colorByTile = useMemo(() => {
    const mapColors = new Map<string, string>()
    const ranked = [...entries]
      .filter((e) => e.tileKeys?.length)
      .sort((a, b) => b.rank - a.rank)
    for (const entry of ranked) {
      for (const key of entry.tileKeys ?? []) {
        mapColors.set(key, entry.colorHex)
      }
    }
    return mapColors
  }, [entries])

  const colorRef = useRef(colorByTile)
  colorRef.current = colorByTile

  useEffect(() => {
    if (!visible) return

    const container = map.getContainer()
    const canvas = document.createElement('canvas')
    canvas.className = 'leaflet-coverage-grid pointer-events-none'
    canvas.style.position = 'absolute'
    canvas.style.left = '0'
    canvas.style.top = '0'
    canvas.style.zIndex = '360'
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
      const cells = visibleGridCells({
        south: bounds.getSouth(),
        north: bounds.getNorth(),
        west: bounds.getWest(),
        east: bounds.getEast(),
      })
      const colors = colorRef.current

      for (const cell of cells) {
        const corners = cellCorners(cell).map(([lat, lng]) =>
          map.latLngToContainerPoint([lat, lng]),
        )
        const xs = corners.map((p) => p.x)
        const ys = corners.map((p) => p.y)
        const minX = Math.min(...xs)
        const maxX = Math.max(...xs)
        const minY = Math.min(...ys)
        const maxY = Math.max(...ys)
        if (maxX < 0 || minX > size.x || maxY < 0 || minY > size.y) continue

        ctx.beginPath()
        ctx.moveTo(corners[0].x, corners[0].y)
        for (let i = 1; i < corners.length; i++) {
          ctx.lineTo(corners[i].x, corners[i].y)
        }
        ctx.closePath()

        const fill = colors.get(cell.key)
        if (fill) {
          ctx.globalAlpha = 0.42
          ctx.fillStyle = fill
          ctx.fill()
        }

        ctx.globalAlpha = lineOpacity
        ctx.strokeStyle = fill ?? '#64748b'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    map.on('move zoom resize viewreset', redraw)
    redraw()

    return () => {
      map.off('move zoom resize viewreset', redraw)
      canvas.remove()
    }
  }, [map, visible, lineOpacity])

  useEffect(() => {
    if (visible) {
      map.fire('move')
    }
  }, [map, visible, colorByTile])

  return null
}
