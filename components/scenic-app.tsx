'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { LatLng, RouteResponse, ScenicWeights } from '@/lib/types'
import { PLACES, DEFAULT_WEIGHTS, pickScenic, pickReturnByPreference, rankReturnCandidates, type ReturnPathPreference } from '@/lib/scenic'
import type { RouteEndpoint } from '@/lib/places'
import {
  endpointsEqual,
  isLocationEndpoint,
  locationEndpoint,
  mapPickEndpoint,
} from '@/lib/places'
import { tilesForPath } from '@/lib/geo'
import type { PastPath } from '@/lib/past-paths'
import { tripToPastPath } from '@/lib/past-paths'
import { joinLoopCoords } from '@/lib/route-overlap'
import {
  buildDirectionSteps,
  distanceToStep,
  findActiveStepIndex,
} from '@/lib/directions'
import { ScenicControls } from '@/components/scenic-controls'
import { RouteSummary } from '@/components/route-summary'
import { CoveragePanel } from '@/components/coverage-panel'
import { DirectionsPanel } from '@/components/directions-panel'
import { MapToolbar } from '@/components/map-toolbar'
import { LocateMeButton } from '@/components/locate-me-button'
import { AuthPanel } from '@/components/auth-panel'
import { ProfilePanel } from '@/components/profile-panel'
import { UserBadge } from '@/components/user-badge'
import { TripHistoryPanel } from '@/components/trip-history-panel'
import { useAuth } from '@/components/auth-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { LeaderboardBar } from '@/components/leaderboard-bar'
import type { LeaderboardEntry } from '@/lib/leaderboard-types'
import type { WeatherResponse } from '@/lib/weather-types'
import { WARSAW_CENTER } from '@/lib/geo'
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
  const { user, claimedTiles, trips, refresh } = useAuth()
  const [start, setStart] = useState<RouteEndpoint>(defaultStart)
  const [end, setEnd] = useState<RouteEndpoint>(defaultEnd)
  const [weights, setWeights] = useState<ScenicWeights>(DEFAULT_WEIGHTS)
  const [budget, setBudget] = useState(20)

  const [data, setData] = useState<RouteResponse | null>(null)
  const [returnData, setReturnData] = useState<RouteResponse | null>(null)
  const [returnLoading, setReturnLoading] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [localCoverage, setLocalCoverage] = useState<Set<string>>(new Set())
  const [localPastPaths, setLocalPastPaths] = useState<PastPath[]>([])
  const coverage = useMemo(() => {
    if (user) return new Set(claimedTiles)
    return localCoverage
  }, [user, claimedTiles, localCoverage])
  const [showCoverage, setShowCoverage] = useState(false)
  const [justAdded, setJustAdded] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [sidebarEl, setSidebarEl] = useState<HTMLDivElement | null>(null)
  const [mapPickTarget, setMapPickTarget] = useState<'start' | 'end' | null>(
    null,
  )
  const [directionsOpen, setDirectionsOpen] = useState(false)
  const [userPosition, setUserPosition] = useState<LatLng | null>(null)
  const [locationAccuracyM, setLocationAccuracyM] = useState<number | null>(
    null,
  )
  const [geoAvailable, setGeoAvailable] = useState(false)
  const [followingUser, setFollowingUser] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null)
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState<string | null>(null)
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
        setLocationAccuracyM(pos.coords.accuracy)
        setGeoAvailable(true)
        setGeoError(null)

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
        setLocationAccuracyM(null)
        setGeoAvailable(false)
        setFollowingUser(false)
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
    setReturnData(null)
    setReturnError(null)
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
    setReturnData(null)
    setReturnError(null)
  }, [data])

  const [manualReturnIndex, setManualReturnIndex] = useState<number | null>(null)
  const [returnPreference, setReturnPreference] =
    useState<ReturnPathPreference>('scenic')

  useEffect(() => {
    setManualReturnIndex(null)
    setReturnPreference('scenic')
  }, [returnData])

  const chosenIndex = manualChosenIndex ?? autoChosenIndex
  const chosen = data ? data.candidates[chosenIndex] : null
  const direct = data ? data.candidates[data.directIndex] : null

  const autoReturnIndex = useMemo(() => {
    if (!returnData || !chosen) return 0
    return pickReturnByPreference(
      returnData.candidates,
      returnData.directIndex,
      weights,
      budget,
      chosen.coords,
      returnPreference,
    )
  }, [returnData, chosen, weights, budget, returnPreference])

  const returnIndex = manualReturnIndex ?? autoReturnIndex
  const returnLeg = returnData ? returnData.candidates[returnIndex] ?? null : null

  const alternateRoutes = useMemo(() => {
    if (!data || !direct) return []
    return data.candidates
      .map((candidate, index) => ({ candidate, index }))
      .filter(
        ({ index }) => index !== chosenIndex && index !== data.directIndex,
      )
      .map(({ candidate, index }) => ({ candidate, index }))
  }, [data, direct, chosenIndex])

  const pastPaths = useMemo(() => {
    const paths: PastPath[] = user
      ? trips
          .map((trip) => tripToPastPath(trip))
          .filter((path): path is PastPath => path !== null)
      : localPastPaths

    return paths.sort(
      (a, b) =>
        new Date(a.drivenAt).getTime() - new Date(b.drivenAt).getTime(),
    )
  }, [user, trips, localPastPaths])

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

  useEffect(() => {
    if (!chosen) {
      setDirectionsOpen(false)
    }
  }, [chosen])

  useEffect(() => {
    setReturnData(null)
    setReturnError(null)
    setManualReturnIndex(null)
  }, [chosen?.id])

  const handleFindReturn = useCallback(async () => {
    if (!chosen) return
    setReturnError(null)

    if (returnData) {
      setReturnPreference('scenic')
      const ranked = rankReturnCandidates(
        returnData.candidates,
        returnData.directIndex,
        weights,
        budget,
        chosen.coords,
      )
      const currentRank = ranked.indexOf(returnIndex)
      const nextIndex =
        ranked[(currentRank + 1) % ranked.length] ?? ranked[0] ?? returnIndex
      setManualReturnIndex(nextIndex)
      return
    }

    setReturnLoading(true)
    try {
      const res = await fetch('/api/route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          start: end.point,
          end: start.point,
          avoidPath: chosen.coords,
        }),
      })
      const payload = (await res.json()) as RouteResponse
      if (!res.ok || 'error' in (payload as { error?: string })) {
        throw new Error(
          (payload as { error?: string }).error ?? 'Could not find a return route',
        )
      }
      setReturnData(payload)
      setManualReturnIndex(null)
    } catch (e) {
      setReturnError(
        e instanceof Error ? e.message : 'Could not find a return route',
      )
    } finally {
      setReturnLoading(false)
    }
  }, [
    chosen,
    returnData,
    returnIndex,
    end.point,
    start.point,
    weights,
    budget,
  ])

  const handleClearReturn = useCallback(() => {
    setReturnData(null)
    setReturnError(null)
    setManualReturnIndex(null)
    setReturnPreference('scenic')
  }, [])

  const handleChooseShortestReturn = useCallback(() => {
    if (!returnData) return
    setReturnPreference('shortest')
    setManualReturnIndex(null)
  }, [returnData])

  const handleChooseLongestReturn = useCallback(() => {
    if (!returnData) return
    setReturnPreference('longest')
    setManualReturnIndex(null)
  }, [returnData])

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

  const handleLocate = useCallback(() => {
    setGeoError(null)

    if (!navigator.geolocation) {
      setGeoError('Location is not supported in this browser.')
      return
    }

    if (userPosition) {
      setFollowingUser(true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const point: LatLng = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }
        setUserPosition(point)
        setLocationAccuracyM(pos.coords.accuracy)
        setGeoAvailable(true)
        setFollowingUser(true)
      },
      () => {
        setGeoError(
          'Could not access your location. Allow location access in your browser.',
        )
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 },
    )
  }, [userPosition])

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
    const loopCoords = returnLeg
      ? joinLoopCoords(chosen.coords, returnLeg.coords)
      : chosen.coords
    const tiles = [...tilesForPath(loopCoords)]
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
            distanceM: returnLeg
              ? chosen.distance + returnLeg.distance
              : chosen.distance,
            durationS: returnLeg
              ? chosen.duration + returnLeg.duration
              : chosen.duration,
            tileKeys: tiles,
            routeCoords: loopCoords,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Could not save ride')
        setJustAdded(data.tilesAdded ?? 0)
        await refresh()
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not save ride')
      }
    } else {
      setLocalPastPaths((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          coords: loopCoords,
          drivenAt: new Date().toISOString(),
        },
      ])
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
  }, [chosen, returnLeg, user, start, end, refresh])

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

  const weatherLat = userPosition?.lat ?? start.point.lat ?? WARSAW_CENTER.lat
  const weatherLng = userPosition?.lng ?? start.point.lng ?? WARSAW_CENTER.lng

  useEffect(() => {
    if (!leaderboardOpen) return
    let cancelled = false
    setLeaderboardLoading(true)
    setLeaderboardError(null)
    fetch('/api/leaderboard')
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Could not load leaderboard')
        if (!cancelled) setLeaderboardEntries(data.entries ?? [])
      })
      .catch((e) => {
        if (!cancelled) {
          setLeaderboardError(
            e instanceof Error ? e.message : 'Could not load leaderboard',
          )
          setLeaderboardEntries([])
        }
      })
      .finally(() => !cancelled && setLeaderboardLoading(false))
    return () => {
      cancelled = true
    }
  }, [leaderboardOpen])

  useEffect(() => {
    if (!leaderboardOpen) return
    let cancelled = false
    setWeatherLoading(true)
    setWeatherError(null)
    const url = `/api/weather?lat=${weatherLat}&lng=${weatherLng}`
    fetch(url)
      .then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error ?? 'Could not load weather')
        if (!cancelled) setWeather(data)
      })
      .catch((e) => {
        if (!cancelled) {
          setWeatherError(
            e instanceof Error ? e.message : 'Could not load weather',
          )
          setWeather(null)
        }
      })
      .finally(() => !cancelled && setWeatherLoading(false))
    return () => {
      cancelled = true
    }
  }, [leaderboardOpen, weatherLat, weatherLng])

  const handleToggleLeaderboard = useCallback(() => {
    setLeaderboardOpen((open) => {
      const next = !open
      if (next) setShowCoverage(true)
      return next
    })
  }, [])

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <LeaderboardBar
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        entries={leaderboardEntries}
        loading={leaderboardLoading}
        error={leaderboardError}
        weather={weather}
        weatherLoading={weatherLoading}
        weatherError={weatherError}
        currentUserId={user?.id}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
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
              Pick two different places to plot a ride.
            </p>
          ) : loading && !chosen ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Finding the pretty way…
            </div>
          ) : error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : chosen && direct ? (
            <>
              <RouteSummary
                chosen={chosen}
                direct={direct}
                returnLeg={returnLeg}
                returnPreference={returnPreference}
                onFindReturn={handleFindReturn}
                onClearReturn={handleClearReturn}
                onChooseShortestReturn={handleChooseShortestReturn}
                onChooseLongestReturn={handleChooseLongestReturn}
                returnLoading={returnLoading}
              />
              {returnError ? (
                <p className="mt-2 text-sm text-destructive" role="alert">
                  {returnError}
                </p>
              ) : null}
            </>
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
          onOpenLeaderboard={handleToggleLeaderboard}
          leaderboardOpen={leaderboardOpen}
        />

        <ProfilePanel />
        <AuthPanel />

        {geoError ? (
          <p className="text-sm text-destructive" role="alert">
            {geoError}
          </p>
        ) : null}

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
              ? 'Cycling routes from GraphHopper / OpenStreetMap (no motorways or tunnels)'
              : 'Simulated cycling routes — add GRAPHHOPPER_API_KEY for live OSM bike routing'}
          </p>
        ) : null}
      </div>

      {/* Map */}
      <div className="relative z-0 min-h-0 flex-1">
        <MapToolbar
          directionsOpen={directionsOpen}
          onDirectionsToggle={() => setDirectionsOpen((open) => !open)}
          hasDirections={Boolean(chosen && directionSteps.length > 0)}
          directionsPanelOpen={directionsOpen}
        />
        <LocateMeButton
          active={followingUser}
          onLocate={handleLocate}
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
          userPosition={userPosition}
          locationAccuracyM={locationAccuracyM}
          followingUserLocation={followingUser}
          onStopFollowingUser={() => setFollowingUser(false)}
          startIsUserLocation={isLocationEndpoint(start)}
          onUseLocationAsStart={
            geoAvailable && userPosition ? handleUseLocationAsStart : undefined
          }
          alternateRoutes={alternateRoutes}
          onSelectRoute={handleSelectRoute}
          pastPaths={pastPaths}
          returnRoute={returnLeg}
          leaderboardOpen={leaderboardOpen}
          leaderboardEntries={leaderboardEntries}
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
      </div>
    </main>
  )
}
