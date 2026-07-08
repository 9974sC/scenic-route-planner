'use client'

import { useEffect, useMemo, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Polyline,
  Rectangle,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { LatLng, RouteCandidate } from '@/lib/types'
import type { Map as LeafletMap } from 'leaflet'
import { WARSAW_BBOX, WARSAW_CENTER, tileBounds, TILE_SIZE } from '@/lib/geo'
import { AlternateRoutesLayer, type AlternateRoute } from '@/components/alternate-routes-layer'
import { TurnMarkersLayer } from '@/components/turn-markers-layer'
import { RouteEndpointMarkers } from '@/components/route-endpoint-markers'
import { UserLocationMarker } from '@/components/user-location-marker'
import { useTheme } from '@/components/theme-provider'

// Leaflet writes SVG stroke attributes, so CSS vars won't resolve in pathOptions.
const MAP_COLORS = {
  light: {
    primary: '#3f7d4f',
    bg: '#f8f7f0',
    gridFill: 0.28,
    gridLine: 0.14,
    chosen: '#ec4899',
    alternates: ['#5b21b6', '#7c3aed', '#9333ea', '#a855f7'],
    directRed: '#dc2626',
    directOrange: '#f97316',
    start: '#16a34a',
    finish: '#ea580c',
    startBg: '#dcfce7',
    finishBg: '#ffedd5',
  },
  dark: {
    primary: '#48e59a',
    bg: '#0f2119',
    gridFill: 0.35,
    gridLine: 0.18,
    chosen: '#f472b6',
    alternates: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed'],
    directRed: '#f87171',
    directOrange: '#fb923c',
    start: '#4ade80',
    finish: '#fb923c',
    startBg: '#14532d',
    finishBg: '#7c2d12',
  },
} as const

const TILE_URL = {
  light:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
} as const

type Props = {
  start: LatLng
  end: LatLng
  chosen: RouteCandidate | null
  direct: RouteCandidate | null
  coverage: Set<string>
  coverageColor?: string
  showCoverage: boolean
  mapPickActive?: boolean
  onMapPick?: (point: LatLng) => void
  headingUp?: boolean
  travelBearing?: number
  headingAnchor?: LatLng | null
  userPosition?: LatLng | null
  startIsUserLocation?: boolean
  onUseLocationAsStart?: () => void
  alternateRoutes?: AlternateRoute[]
  onSelectRoute?: (index: number) => void
}

const ROTATABLE_PANES = [
  'tilePane',
  'overlayPane',
  'shadowPane',
  'markerPane',
  'tooltipPane',
] as const

const FIXED_NORTH_PANE = 'fixedNorthPane'

// One controller keeps the map sized to its container and frames the chosen
// route. Everything runs through a single rAF-guarded routine so invalidateSize
// never fires synchronously inside the ResizeObserver callback (that synchronous
// reflow is what triggers the "ResizeObserver loop completed with undelivered
// notifications" error).
function MapController({
  chosen,
  headingUp,
}: {
  chosen: RouteCandidate | null
  headingUp: boolean
}) {
  const map = useMap()
  const chosenRef = useRef(chosen)
  chosenRef.current = chosen
  const headingUpRef = useRef(headingUp)
  headingUpRef.current = headingUp

  useEffect(() => {
    const container = map.getContainer()
    let frame = 0

    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false })
        if (headingUpRef.current) return
        const route = chosenRef.current
        if (route && route.coords.length) {
          map.fitBounds(route.coords as [number, number][], {
            padding: [56, 56],
            animate: false,
          })
        }
      })
    }

    const ro = new ResizeObserver(sync)
    ro.observe(container)
    sync()
    window.addEventListener('resize', sync)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', sync)
    }
  }, [map])

  // Re-frame whenever the chosen route changes (skip while travel direction is locked).
  useEffect(() => {
    if (headingUp) return
    if (chosen && chosen.coords.length) {
      map.invalidateSize({ animate: false })
      map.fitBounds(chosen.coords as [number, number][], {
        padding: [56, 56],
        animate: true,
      })
    }
  }, [chosen, map, headingUp])

  return null
}

function MapPickHandler({
  active,
  onPick,
}: {
  active: boolean
  onPick?: (point: LatLng) => void
}) {
  const map = useMap()

  useEffect(() => {
    const container = map.getContainer()
    container.style.cursor = active ? 'crosshair' : ''
    return () => {
      container.style.cursor = ''
    }
  }, [active, map])

  useMapEvents({
    click(e) {
      if (!active || !onPick) return
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })

  return null
}

/** Leaflet pane for grid + coverage — stays north-up when travel direction is on. */
function FixedNorthPane() {
  const map = useMap()

  useEffect(() => {
    if (map.getPane(FIXED_NORTH_PANE)) return
    map.createPane(FIXED_NORTH_PANE)
    const pane = map.getPane(FIXED_NORTH_PANE)
    if (pane) pane.style.zIndex = '350'
  }, [map])

  return null
}

function clearPaneRotation(map: LeafletMap) {
  for (const name of ROTATABLE_PANES) {
    const el = map.getPane(name) as HTMLElement | undefined
    if (!el) continue
    el.style.transform = ''
    el.style.transformOrigin = ''
    el.style.transition = ''
  }
}

/** Rotate basemap + routes so travel bearing points up; grid stays fixed. */
function MapHeadingController({
  enabled,
  bearingDeg,
  anchor,
}: {
  enabled: boolean
  bearingDeg: number
  anchor: LatLng | null
}) {
  const map = useMap()
  const stateRef = useRef({ enabled, bearingDeg, anchor })
  stateRef.current = { enabled, bearingDeg, anchor }
  const applyRef = useRef<() => void>(() => {})

  useEffect(() => {
    const apply = () => {
      const { enabled, bearingDeg, anchor } = stateRef.current
      if (!enabled) return

      let origin: string
      if (anchor) {
        const pt = map.latLngToContainerPoint([anchor.lat, anchor.lng])
        origin = `${pt.x}px ${pt.y}px`
      } else {
        const size = map.getSize()
        origin = `${size.x / 2}px ${size.y / 2}px`
      }

      const transform = `rotate(${-bearingDeg}deg)`
      for (const name of ROTATABLE_PANES) {
        const el = map.getPane(name) as HTMLElement | undefined
        if (!el) continue
        el.style.transformOrigin = origin
        el.style.transition = 'transform 0.2s ease-out'
        el.style.transform = transform
      }
    }

    applyRef.current = apply

    const onViewChange = () => {
      requestAnimationFrame(apply)
    }

    if (!enabled) {
      clearPaneRotation(map)
      return
    }

    apply()
    map.on(
      'move zoom moveend zoomend drag dragend viewreset',
      onViewChange,
    )

    return () => {
      map.off(
        'move zoom moveend zoomend drag dragend viewreset',
        onViewChange,
      )
      clearPaneRotation(map)
    }
  }, [map, enabled])

  useEffect(() => {
    if (enabled) applyRef.current()
  }, [enabled, bearingDeg, anchor?.lat, anchor?.lng])

  return null
}

/** Canvas-drawn coverage grid — north-up, not rotated with travel direction. */
function SquareGridLayer({
  visible,
  color,
  lineOpacity,
}: {
  visible: boolean
  color: string
  lineOpacity: number
}) {
  const map = useMap()

  useEffect(() => {
    if (!visible) return

    const pane = map.getPane(FIXED_NORTH_PANE)
    if (!pane) return

    const canvas = document.createElement('canvas')
    canvas.className =
      'leaflet-coverage-grid pointer-events-none absolute left-0 top-0'
    pane.appendChild(canvas)

    const strokeSegment = (
      ctx: CanvasRenderingContext2D,
      a: { x: number; y: number },
      b: { x: number; y: number },
    ) => {
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }

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
      ctx.strokeStyle = color
      ctx.globalAlpha = lineOpacity
      ctx.lineWidth = 1

      const view = map.getBounds()
      const south = Math.max(view.getSouth(), WARSAW_BBOX.south)
      const north = Math.min(view.getNorth(), WARSAW_BBOX.north)
      const west = Math.max(view.getWest(), WARSAW_BBOX.west)
      const east = Math.min(view.getEast(), WARSAW_BBOX.east)
      if (south >= north || west >= east) return

      const tyStart = Math.floor((south - WARSAW_BBOX.south) / TILE_SIZE)
      const tyEnd = Math.ceil((north - WARSAW_BBOX.south) / TILE_SIZE)

      for (let ty = tyStart; ty <= tyEnd; ty++) {
        const rowSouth = WARSAW_BBOX.south + ty * TILE_SIZE
        const rowNorth = rowSouth + TILE_SIZE
        if (rowNorth < south || rowSouth > north) continue

        const txStart = Math.floor((west - WARSAW_BBOX.west) / TILE_SIZE)
        const txEnd = Math.ceil((east - WARSAW_BBOX.west) / TILE_SIZE)

        for (const lat of [rowSouth, rowNorth]) {
          if (lat < south - 1e-9 || lat > north + 1e-9) continue
          const p1 = map.latLngToContainerPoint([lat, west])
          const p2 = map.latLngToContainerPoint([lat, east])
          strokeSegment(ctx, p1, p2)
        }

        for (let tx = txStart; tx <= txEnd; tx++) {
          const lngWest = WARSAW_BBOX.west + tx * TILE_SIZE
          const lngEast = lngWest + TILE_SIZE
          const latMin = Math.max(rowSouth, south)
          const latMax = Math.min(rowNorth, north)

          for (const lng of [lngWest, lngEast]) {
            if (lng < west - 1e-9 || lng > east + 1e-9) continue
            const p1 = map.latLngToContainerPoint([latMin, lng])
            const p2 = map.latLngToContainerPoint([latMax, lng])
            strokeSegment(ctx, p1, p2)
          }
        }
      }
    }

    map.on('move zoom resize viewreset', redraw)
    redraw()

    return () => {
      map.off('move zoom resize viewreset', redraw)
      canvas.remove()
    }
  }, [map, visible, color, lineOpacity])

  return null
}

export default function ScenicMap({
  start,
  end,
  chosen,
  direct,
  coverage,
  coverageColor,
  showCoverage,
  mapPickActive = false,
  onMapPick,
  headingUp = false,
  travelBearing = 0,
  headingAnchor = null,
  userPosition = null,
  startIsUserLocation = false,
  onUseLocationAsStart,
  alternateRoutes = [],
  onSelectRoute,
}: Props) {
  const { resolvedTheme } = useTheme()
  const C = MAP_COLORS[resolvedTheme]
  const tileColor = coverageColor ?? C.primary
  const coveredTiles = useMemo(() => Array.from(coverage), [coverage])
  const themedAlternates = useMemo(
    () =>
      alternateRoutes.map((route, i) => ({
        ...route,
        color: C.alternates[i % C.alternates.length],
      })),
    [alternateRoutes, C.alternates],
  )

  return (
    <MapContainer
      center={[WARSAW_CENTER.lat, WARSAW_CENTER.lng]}
      zoom={12}
      zoomControl={false}
      className="h-full w-full"
      style={{ background: C.bg }}
    >
      <TileLayer
        key={resolvedTheme}
        attribution='&copy; OpenStreetMap, &copy; CARTO'
        url={TILE_URL[resolvedTheme]}
      />
      <MapController chosen={chosen} headingUp={headingUp && Boolean(chosen)} />
      <FixedNorthPane />
      <MapPickHandler active={mapPickActive} onPick={onMapPick} />
      <MapHeadingController
        enabled={headingUp && Boolean(chosen)}
        bearingDeg={travelBearing}
        anchor={headingAnchor}
      />

      {/* Coverage grid (north-up) + filled cells */}
      {showCoverage && (
        <>
          <SquareGridLayer
            visible
            color={tileColor}
            lineOpacity={C.gridLine}
          />
          {coveredTiles.map((key) => (
            <Rectangle
              key={key}
              bounds={tileBounds(key)}
              pane={FIXED_NORTH_PANE}
              pathOptions={{
                color: tileColor,
                weight: 0.5,
                opacity: 1,
                fillColor: tileColor,
                fillOpacity: C.gridFill,
              }}
              interactive={false}
            />
          ))}
        </>
      )}

      {/* Alternate routes — purple, hover for details, click to select */}
      {direct && onSelectRoute && themedAlternates.length > 0 && (
        <AlternateRoutesLayer
          routes={themedAlternates}
          direct={direct}
          mapPickActive={mapPickActive}
          onSelect={onSelectRoute}
        />
      )}

      {/* Direct / fastest route — red & orange dashed overlay */}
      {direct && chosen && direct.id !== chosen.id && (
        <>
          <Polyline
            positions={direct.coords}
            pathOptions={{
              color: C.directRed,
              weight: 5,
              opacity: 0.75,
              dashArray: '10 8',
              lineJoin: 'round',
              lineCap: 'round',
            }}
          />
          <Polyline
            positions={direct.coords}
            pathOptions={{
              color: C.directOrange,
              weight: 3,
              opacity: 0.9,
              dashArray: '4 12',
              lineJoin: 'round',
              lineCap: 'round',
            }}
          />
        </>
      )}

      {/* Selected route — pink */}
      {chosen && (
        <Polyline
          positions={chosen.coords}
          pathOptions={{
            color: C.chosen,
            weight: 7,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      )}

      {/* Turn direction markers (above route line, below UI overlays) */}
      {chosen?.turnMarkers && chosen.turnMarkers.length > 0 && (
        <TurnMarkersLayer markers={chosen.turnMarkers} color={C.chosen} />
      )}

      <RouteEndpointMarkers
        start={start}
        end={end}
        startColor={C.start}
        finishColor={C.finish}
        startBg={C.startBg}
        finishBg={C.finishBg}
        hideStart={startIsUserLocation && Boolean(userPosition)}
      />

      {userPosition ? (
        <UserLocationMarker
          position={userPosition}
          isStart={startIsUserLocation}
          onSelectAsStart={onUseLocationAsStart}
        />
      ) : null}
    </MapContainer>
  )
}
