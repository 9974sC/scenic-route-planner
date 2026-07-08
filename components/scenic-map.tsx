'use client'

import { useEffect, useMemo, useRef, useCallback } from 'react'
import {
  MapContainer,
  TileLayer,
  Polyline,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import type { LatLng, RouteCandidate } from '@/lib/types'
import { WARSAW_CENTER } from '@/lib/geo'
import type { PastPath } from '@/lib/past-paths'
import { joinLoopCoords } from '@/lib/route-overlap'
import { AlternateRoutesLayer, type AlternateRoute } from '@/components/alternate-routes-layer'
import { SelectedRouteLayer } from '@/components/selected-route-layer'
import { PastPathsLayer } from '@/components/past-paths-layer'
import { TurnMarkersLayer } from '@/components/turn-markers-layer'
import { RouteEndpointMarkers } from '@/components/route-endpoint-markers'
import { UserLocationMarker } from '@/components/user-location-marker'
import { LeaderboardTilesLayer } from '@/components/leaderboard-tiles-layer'
import { PlayingFieldGridLayer } from '@/components/playing-field-grid-layer'
import { CoveredTilesLayer } from '@/components/covered-tiles-layer'
import type { LeaderboardEntry } from '@/lib/leaderboard-types'
import { useTheme } from '@/components/theme-provider'

// Leaflet writes SVG stroke attributes, so CSS vars won't resolve in pathOptions.
const MAP_COLORS = {
  light: {
    primary: '#3f7d4f',
    bg: '#f8f7f0',
    gridFill: 0.28,
    gridLine: 0.14,
    loopOutbound: '#15803d',
    loopReturn: '#c2410c',
    returnLeg: '#0d9488',
    alternates: ['#2563eb', '#ea580c', '#0891b2', '#c026d3', '#ca8a04', '#dc2626'],
    directRed: '#dc2626',
    directOrange: '#f97316',
    start: '#16a34a',
    finish: '#ea580c',
    startBg: '#dcfce7',
    finishBg: '#ffedd5',
    gridStroke: '#475569',
  },
  dark: {
    primary: '#9dd4b8',
    bg: '#2a3531',
    gridFill: 0.32,
    gridLine: 0.16,
    loopOutbound: '#a8d4f0',
    loopReturn: '#f5d0a8',
    returnLeg: '#9ee8d8',
    alternates: ['#a8c8f5', '#f5b8c8', '#a8e8f0', '#e8b8f5', '#f5e8a8', '#b8f5c8'],
    directRed: '#f5a8a8',
    directOrange: '#f5c49a',
    start: '#a8e8b8',
    finish: '#f5c49a',
    startBg: '#3d5248',
    finishBg: '#524840',
    gridStroke: '#d8e8e0',
  },
} as const

const TILE_URL = {
  light:
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
} as const

export type MapFocusTarget = {
  lat: number
  lng: number
  key: number
}

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
  userPosition?: LatLng | null
  locationAccuracyM?: number | null
  followingUserLocation?: boolean
  onStopFollowingUser?: () => void
  startIsUserLocation?: boolean
  onUseLocationAsStart?: () => void
  alternateRoutes?: AlternateRoute[]
  onSelectRoute?: (index: number) => void
  userSpeedKmh?: number
  pastPaths?: PastPath[]
  returnRoute?: RouteCandidate | null
  leaderboardOpen?: boolean
  leaderboardEntries?: LeaderboardEntry[]
  mapFocus?: MapFocusTarget | null
  hideEndMarker?: boolean
}

// One controller keeps the map sized to its container and frames the chosen
// route. Everything runs through a single rAF-guarded routine so invalidateSize
// never fires synchronously inside the ResizeObserver callback (that synchronous
// reflow is what triggers the "ResizeObserver loop completed with undelivered
// notifications" error).
function MapController({
  chosen,
  returnRoute,
  followingUser,
}: {
  chosen: RouteCandidate | null
  returnRoute: RouteCandidate | null
  followingUser: boolean
}) {
  const map = useMap()
  const chosenRef = useRef(chosen)
  chosenRef.current = chosen
  const returnRef = useRef(returnRoute)
  returnRef.current = returnRoute
  const followingUserRef = useRef(followingUser)
  followingUserRef.current = followingUser

  const fitCoords = useCallback((): [number, number][] | null => {
    const outbound = chosenRef.current
    if (!outbound?.coords.length) return null
    const inbound = returnRef.current
    if (inbound?.coords.length) {
      return joinLoopCoords(outbound.coords, inbound.coords)
    }
    return outbound.coords
  }, [])

  useEffect(() => {
    const container = map.getContainer()
    let frame = 0

    const sync = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        map.invalidateSize({ animate: false })
        if (followingUserRef.current) return
        const coords = fitCoords()
        if (coords?.length) {
          map.fitBounds(coords, {
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
  }, [map, fitCoords])

  // Re-frame whenever the chosen route changes (skip while following user).
  useEffect(() => {
    if (followingUser) return
    const coords = fitCoords()
    if (coords?.length) {
      map.invalidateSize({ animate: false })
      map.fitBounds(coords, {
        padding: [56, 56],
        animate: true,
      })
    }
  }, [chosen, returnRoute, map, followingUser, fitCoords])

  return null
}

/** Center on the user and keep them in view while follow mode is active. */
function MapLocateController({
  following,
  position,
  onStopFollowing,
}: {
  following: boolean
  position: LatLng | null
  onStopFollowing: () => void
}) {
  const map = useMap()
  const followingRef = useRef(following)
  followingRef.current = following
  const wasFollowingRef = useRef(false)

  useMapEvents({
    dragstart() {
      if (followingRef.current) onStopFollowing()
    },
  })

  useEffect(() => {
    if (!following || !position) {
      wasFollowingRef.current = false
      return
    }

    const latlng: [number, number] = [position.lat, position.lng]
    if (!wasFollowingRef.current) {
      map.flyTo(latlng, Math.max(map.getZoom(), 15), { duration: 0.45 })
    } else {
      map.panTo(latlng, { animate: true, duration: 0.25 })
    }
    wasFollowingRef.current = true
  }, [following, position?.lat, position?.lng, map])

  return null
}

/** Fly to a point when the user selects a direction step. */
function MapFocusController({ focus }: { focus: MapFocusTarget | null }) {
  const map = useMap()
  const lastKeyRef = useRef<number | null>(null)

  useEffect(() => {
    if (!focus || focus.key === lastKeyRef.current) return
    lastKeyRef.current = focus.key
    map.flyTo(
      [focus.lat, focus.lng],
      Math.max(map.getZoom(), 15),
      { duration: 0.45 },
    )
  }, [focus, map])

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
  userPosition = null,
  locationAccuracyM = null,
  followingUserLocation = false,
  onStopFollowingUser,
  startIsUserLocation = false,
  onUseLocationAsStart,
  alternateRoutes = [],
  onSelectRoute,
  userSpeedKmh = 15,
  pastPaths = [],
  returnRoute = null,
  leaderboardOpen = false,
  leaderboardEntries = [],
  mapFocus = null,
  hideEndMarker = false,
}: Props) {
  const { resolvedTheme } = useTheme()
  const C = MAP_COLORS[resolvedTheme]
  const tileColor = coverageColor ?? C.primary
  const coveredTiles = useMemo(() => Array.from(coverage), [coverage])
  const isRoundTrip = Boolean(returnRoute)
  const outboundColor = isRoundTrip ? C.loopOutbound : C.primary
  const returnColor = isRoundTrip ? C.loopReturn : C.returnLeg
  const themedAlternates = useMemo(
    () =>
      alternateRoutes.map((route, i) => ({
        ...route,
        color: route.isDirect
          ? C.directRed
          : (route.color ?? C.alternates[i % C.alternates.length]),
      })),
    [alternateRoutes, C.alternates, C.directRed],
  )
  const directShownAsAlternate = themedAlternates.some((route) => route.isDirect)

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
      <MapController
        chosen={chosen}
        returnRoute={returnRoute}
        followingUser={followingUserLocation}
      />
      <MapLocateController
        following={followingUserLocation}
        position={userPosition}
        onStopFollowing={() => onStopFollowingUser?.()}
      />
      <MapFocusController focus={mapFocus} />
      <MapPickHandler active={mapPickActive} onPick={onMapPick} />

      {leaderboardOpen ? (
        <>
          <PlayingFieldGridLayer gridColor={C.gridStroke} />
          {leaderboardEntries.length > 0 ? (
            <LeaderboardTilesLayer
              entries={leaderboardEntries}
              gridColor={C.gridStroke}
              fillOpacity={C.gridFill + 0.14}
            />
          ) : null}
        </>
      ) : showCoverage ? (
        <>
          <PlayingFieldGridLayer gridColor={C.gridStroke} />
          <CoveredTilesLayer
            coveredKeys={coveredTiles}
            color={tileColor}
            gridColor={C.gridStroke}
            fillOpacity={C.gridFill + 0.14}
          />
        </>
      ) : null}

      <PastPathsLayer paths={pastPaths} theme={resolvedTheme} />

      {/* Alternate routes — distinct colors, hover for details, click to select */}
      {chosen && onSelectRoute && themedAlternates.length > 0 && (
        <AlternateRoutesLayer
          routes={themedAlternates}
          reference={chosen}
          userSpeedKmh={userSpeedKmh}
          mapPickActive={mapPickActive}
          onSelect={onSelectRoute}
        />
      )}

      {/* Direct / fastest route — red dashed when not selectable as alternate */}
      {direct &&
        chosen &&
        direct.id !== chosen.id &&
        !isRoundTrip &&
        !directShownAsAlternate && (
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

      {/* Selected route — primary green (one-way) or loop outbound color */}
      {chosen && (
        <SelectedRouteLayer
          route={chosen}
          color={outboundColor}
          userSpeedKmh={userSpeedKmh}
          mapPickActive={mapPickActive}
        />
      )}

      {/* Return leg — dashed loop back to start */}
      {returnRoute && (
        <Polyline
          positions={returnRoute.coords}
          pathOptions={{
            color: returnColor,
            weight: 9,
            opacity: 0.9,
            dashArray: '10 6',
            lineJoin: 'round',
            lineCap: 'round',
          }}
        />
      )}

      {chosen?.turnMarkers && chosen.turnMarkers.length > 0 && (
        <TurnMarkersLayer markers={chosen.turnMarkers} color={outboundColor} />
      )}

      {returnRoute?.turnMarkers && returnRoute.turnMarkers.length > 0 && (
        <TurnMarkersLayer
          markers={returnRoute.turnMarkers}
          color={returnColor}
        />
      )}

      <RouteEndpointMarkers
        start={start}
        end={end}
        startColor={C.start}
        finishColor={C.finish}
        startBg={C.startBg}
        finishBg={C.finishBg}
        hideStart={startIsUserLocation && Boolean(userPosition)}
        hideEnd={hideEndMarker}
      />

      {userPosition ? (
        <>
          {locationAccuracyM && locationAccuracyM > 0 ? (
            <Circle
              center={[userPosition.lat, userPosition.lng]}
              radius={locationAccuracyM}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#2563eb',
                fillOpacity: 0.12,
                weight: 1,
                opacity: 0.35,
              }}
              interactive={false}
            />
          ) : null}
          <UserLocationMarker
            position={userPosition}
            isStart={startIsUserLocation}
            following={followingUserLocation}
            onSelectAsStart={onUseLocationAsStart}
          />
        </>
      ) : null}
    </MapContainer>
  )
}
