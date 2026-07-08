'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { LatLng, RouteResponse, ScenicWeights } from '@/lib/types'
import { PLACES, DEFAULT_WEIGHTS, pickScenic } from '@/lib/scenic'
import type { RouteEndpoint } from '@/lib/places'
import {
  endpointsEqual,
  isLocationEndpoint,
  locationEndpoint,
  mapPickEndpoint,
} from '@/lib/places'
import { tilesForPath } from '@/lib/geo'
import {
  buildDirectionSteps,
  distanceToStep,
  findActiveStepIndex,
  travelBearingAtPosition,
} from '@/lib/directions'
import { ScenicControls } from '@/components/scenic-controls'
import { RouteSummary } from '@/components/route-summary'
import { CoveragePanel } from '@/components/coverage-panel'
import { DirectionsPanel } from '@/components/directions-panel'
import { MapToolbar } from '@/components/map-toolbar'
import { AuthPanel } from '@/components/auth-panel'
import { UserBadge } from '@/components/user-badge'
import { TripHistoryPanel } from '@/components/trip-history-panel'
import { useAuth } from '@/components/auth-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { Compass, Loader2, Sparkles } from 'lucide-react'

const ScenicMap = dynamic(() => import('@/components/scenic-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

function defaultStart(): RouteEndpoint {
  return PLACES.find((p) => p.id === 'oldtown') ?? PLACES[0]
}

function defaultEnd(): RouteEndpoint {
  return PLACES.find((p) => p.id === 'kabaty') ?? PLACES[0]
}

export function ScenicApp() {
  const { user, claimedTiles, refresh } = useAuth()
  const [start, setStart] = useState<RouteEndpoint>(defaultStart)
  const [end, setEnd] = useState<RouteEndpoint>(defaultEnd)
  const [weights, setWeights] = useState<ScenicWeights>(DEFAULT_WEIGHTS)
  const [budget, setBudget] = useState(20)

  const [data, setData] = useState<RouteResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [localCoverage, setLocalCoverage] = useState<Set<string>>(new Set())
  const coverage = useMemo(() => {
    if (user) return new Set(claimedTiles)
    return localCoverage
  }, [user, claimedTiles, localCoverage])
  const [showCoverage, setShowCoverage] = useState(true)
  const [justAdded, setJustAdded] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [sidebarEl, setSidebarEl] = useState<HTMLDivElement | null>(null)
  const [mapPickTarget, setMapPickTarget] = useState<'start' | 'end' | null>(
    null,
  )
  const [directionsOpen, setDirectionsOpen] = useState(false)
  const [headingUp, setHeadingUp] = useState(false)
  const [userPosition, setUserPosition] = useState<LatLng | null>(null)
  const [geoAvailable, setGeoAvailable] = useState(false)
  const startTouchedRef = useRef(false)
  const geoDefaultAppliedRef = useRef(false)

  const setStartManual = useCallback((endpoint: RouteEndpoint) => {
    startTouchedRef.current = true
    setStart(endpoint)
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const point: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setUserPosition(point)
        setGeoAvailable(true)

        setStart((current) => {
          if (isLocationEndpoint(current)) {
            return locationEndpoint(point)
          }
          if (!startTouchedRef.current && !geoDefaultAppliedRef.current) {
            geoDefaultAppliedRef.current = true
            return locationEndpoint(point)
          }
          return current
        })
      },
      () => {
        setUserPosition(null)
        setGeoAvailable(false)
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 10_000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  // Fetch candidate routes only when the endpoints change (sliders stay instant)
  useEffect(() => {
    if (endpointsEqual(start, end)) {
      setData(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    fetch('/api/route', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ start: start.point, end: end.point }),
    })
      .then((r) => r.json())
      .then((res: RouteResponse) => {
        if (cancelled) return
        if ('error' in (res as any)) throw new Error((res as any).error)
        setData(res)
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end])

  const autoChosenIndex = useMemo(() => {
    if (!data) return 0
    return pickScenic(data.candidates, data.directIndex, weights, budget)
  }, [data, weights, budget])

  const [manualChosenIndex, setManualChosenIndex] = useState<number | null>(null)

  useEffect(() => {
    setManualChosenIndex(null)
  }, [data])

  const chosenIndex = manualChosenIndex ?? autoChosenIndex

  const chosen = data ? data.candidates[chosenIndex] : null
  const direct = data ? data.candidates[data.directIndex] : null

  const alternateRoutes = useMemo(() => {
    if (!data || !direct) return []
    return data.candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter(
        ({ index }) => index !== chosenIndex && index !== data.directIndex,
      )
      .map(({ candidate, index }) => ({ candidate, index }))
  }, [data, direct, chosenIndex])

  const handleSelectRoute = useCallback((index: number) => {
    setManualChosenIndex(index)
  }, [])

  const directionSteps = useMemo(() => {
    if (!chosen?.turnMarkers?.length) return []
    return buildDirectionSteps(chosen.coords, chosen.turnMarkers)
  }, [chosen])

  const activeStepIndex = useMemo(() => {
    if (!chosen || !directionSteps.length) return 0
    const pos = userPosition ?? start.point
    return findActiveStepIndex(chosen.coords, directionSteps, pos)
  }, [chosen, directionSteps, userPosition, start.point])

  const distanceToNextM = useMemo(() => {
    if (!chosen || !directionSteps.length) return null
    const pos = userPosition ?? start.point
    const step = directionSteps[activeStepIndex]
    if (!step) return null
    return distanceToStep(chosen.coords, step, pos)
  }, [chosen, directionSteps, activeStepIndex, userPosition, start.point])

  const currentPositionLabel = useMemo(() => {
    if (userPosition && geoAvailable) return 'Your location'
    return start.name
  }, [userPosition, geoAvailable, start.name])

  const navigationPosition = userPosition ?? start.point

  const travelBearing = useMemo(() => {
    if (!chosen?.coords.length) return 0
    return travelBearingAtPosition(chosen.coords, navigationPosition)
  }, [chosen, navigationPosition])

  useEffect(() => {
    if (!chosen) {
      setDirectionsOpen(false)
      setHeadingUp(false)
    }
  }, [chosen])

  const handleSwap = useCallback(() => {
    setStartManual(end)
    setEnd(start)
  }, [start, end, setStartManual])

  const handleMapPickRequest = useCallback((target: 'start' | 'end') => {
    setMapPickTarget((current) => (current === target ? null : target))
  }, [])

  const handleUseLocationAsStart = useCallback(() => {
    if (!userPosition) return
    setStartManual(locationEndpoint(userPosition))
  }, [userPosition, setStartManual])

  const handleMapPick = useCallback(
    (point: { lat: number; lng: number }) => {
      if (!mapPickTarget) return
      const picked = mapPickEndpoint(point)
      if (mapPickTarget === 'start') setStartManual(picked)
      else setEnd(picked)
      setMapPickTarget(null)
    },
    [mapPickTarget, setStartManual],
  )

  const handleAddRoute = useCallback(async () => {
    if (!chosen) return
    const tiles = [...tilesForPath(chosen.coords)]
    setSaveError(null)

    if (user) {
      try {
        const res = await fetch('/api/trips', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            startName: start.name,
            startLat: start.point.lat,
            startLng: start.point.lng,
            endName: end.name,
            endLat: end.point.lat,
            endLng: end.point.lng,
            distanceM: chosen.distance,
            durationS: chosen.duration,
            tileKeys: tiles,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not save drive')
        setJustAdded(data.tilesAdded ?? 0)
        await refresh()
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not save drive')
      }
    } else {
      setLocalCoverage((prev) => {
        const next = new Set(prev)
        let added = 0
        tiles.forEach((t) => {
          if (!next.has(t)) {
            next.add(t)
            added++
          }
        })
        setJustAdded(added)
        return next
      })
    }
    setShowCoverage(true)
  }, [chosen, user, start, end, refresh])

  const handleResetCoverage = useCallback(async () => {
    setSaveError(null)
    if (user) {
      try {
        const res = await fetch('/api/coverage', {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? 'Could not reset coverage')
        }
        await refresh()
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not reset coverage')
      }
      return
    }
    setLocalCoverage(new Set())
  }, [user, refresh])

  useEffect(() => {
    if (justAdded === null) return
    const t = setTimeout(() => setJustAdded(null), 2600)
    return () => clearTimeout(t)
  }, [justAdded])

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background lg:flex-row">
      {/* Control column */}
      <div
        ref={setSidebarEl}
        className="relative z-20 flex w-full shrink-0 flex-col gap-2 overflow-y-auto overflow-x-hidden border-b border-border bg-background p-3 lg:h-full lg:w-[400px] lg:border-b-0 lg:border-r"
      >
        <header className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Compass className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold leading-none text-foreground">
                Scenic
              </h1>
              <p className="text-xs text-muted-foreground">
                take the long way home
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <UserBadge />

        <ScenicControls
          start={start}
          end={end}
          weights={weights}
          budget={budget}
          onStart={setStartManual}
          onEnd={setEnd}
          onWeights={setWeights}
          onBudget={setBudget}
          onSwap={handleSwap}
          menuContainer={sidebarEl}
          mapPickTarget={mapPickTarget}
          onMapPickRequest={handleMapPickRequest}
          userPosition={geoAvailable ? userPosition : null}
        />

        <div className="rounded-xl border border-border bg-card p-4">
          {endpointsEqual(start, end) ? (
            <p className="text-sm text-muted-foreground">
              Pick two different places to plot a drive.
            </p>
          ) : loading && !chosen ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Finding the pretty way…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : chosen && direct ? (
            <RouteSummary chosen={chosen} direct={direct} />
          ) : null}
        </div>

        <CoveragePanel
          coverageCount={coverage.size}
          showCoverage={showCoverage}
          onToggle={setShowCoverage}
          onAddRoute={handleAddRoute}
          onReset={handleResetCoverage}
          justAdded={justAdded}
          signedIn={Boolean(user)}
        />

        <AuthPanel />

        {saveError ? (
          <p className="text-sm text-destructive" role="alert">
            {saveError}
          </p>
        ) : null}

        <TripHistoryPanel />

        {data ? (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-accent-foreground" aria-hidden />
            {data.source === 'graphhopper'
              ? 'Live routes from GraphHopper / OpenStreetMap'
              : 'Simulated routes — add GRAPHHOPPER_API_KEY for live OSM routing'}
          </p>
        ) : null}
      </div>

      {/* Map */}
      <div className="relative z-0 min-h-0 flex-1">
        <MapToolbar
          directionsOpen={directionsOpen}
          onDirectionsToggle={() => setDirectionsOpen((open) => !open)}
          hasDirections={Boolean(chosen && directionSteps.length > 0)}
          showCoverage={showCoverage}
          onCoverageToggle={() => setShowCoverage((on) => !on)}
          headingUp={headingUp}
          onHeadingToggle={() => setHeadingUp((on) => !on)}
          canUseHeading={Boolean(chosen?.coords.length)}
          directionsPanelOpen={directionsOpen}
        />
        <ScenicMap
          start={start.point}
          end={end.point}
          chosen={chosen}
          direct={direct}
          coverage={coverage}
          coverageColor={user?.colorHex}
          showCoverage={showCoverage}
          mapPickActive={mapPickTarget !== null}
          onMapPick={handleMapPick}
          headingUp={headingUp}
          travelBearing={travelBearing}
          headingAnchor={navigationPosition}
          userPosition={geoAvailable ? userPosition : null}
          startIsUserLocation={isLocationEndpoint(start)}
          onUseLocationAsStart={
            geoAvailable && userPosition ? handleUseLocationAsStart : undefined
          }
          alternateRoutes={alternateRoutes}
          onSelectRoute={handleSelectRoute}
        />
        <DirectionsPanel
          open={directionsOpen}
          onOpenChange={setDirectionsOpen}
          steps={directionSteps}
          startLabel={start.name}
          endLabel={end.name}
          activeStepIndex={activeStepIndex}
          currentPosition={navigationPosition}
          currentPositionLabel={currentPositionLabel}
          distanceToNextM={distanceToNextM}
          hasRoute={Boolean(chosen && directionSteps.length > 0)}
        />
      </div>
    </main>
  )
}
