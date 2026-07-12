'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { LatLng, RouteResponse } from '@/lib/types'
import { pickOutboundByPreference, pickReturnByPreference, rankReturnCandidates, DEFAULT_MAX_EXTRA_KM, DEFAULT_ROUTE_CONSTRAINTS, DEFAULT_USER_SPEED_KMH, clampUserSpeedKmh, MIN_EXTRA_KM_TO_LOCATION, scenicScorePercent, type ReturnPathPreference, type RoutePickConstraints } from '@/lib/scenic'
import {
  DEFAULT_PREFERENCES,
  preferencesToWeights,
  weightsToPreferences,
} from '@/lib/scenic-preferences'
import type { SavedRouteSummary } from '@/lib/saved-routes'
import {
  isSavedAddressSet,
  savedAddressToEndpoint,
} from '@/lib/saved-address'
import type { RouteEndpoint } from '@/lib/places'
import {
  customEndpoint,
  defaultStartPreset,
  blankEndpoint,
  endpointsEqual,
  isBlankEndpoint,
  isLocationEndpoint,
  isScenicDetourEndpoint,
  locationEndpoint,
  mapPickEndpoint,
} from '@/lib/places'
import { tilesForPath } from '@/lib/geo'
import { normalizeStoredTileKeys } from '@/lib/tile-migration'
import { tileKeysForSave } from '@/lib/tile-save'
import type { PastPath } from '@/lib/past-paths'
import { tripToPastPath } from '@/lib/past-paths'
import { joinLoopCoords } from '@/lib/route-overlap'
import {
  buildDirectionSteps,
  distanceToStep,
  findActiveStepIndex,
  type DirectionStep,
} from '@/lib/directions'
import { ScenicControls } from '@/components/scenic-controls'
import { RouteSummary } from '@/components/route-summary'
import { CoveragePanel } from '@/components/coverage-panel'
import { DirectionsPanel } from '@/components/directions-panel'
import { MapToolbar } from '@/components/map-toolbar'
import { LocateMeButton } from '@/components/locate-me-button'
import { AuthPanel } from '@/components/auth-panel'
import { UserBadge } from '@/components/user-badge'
import { ProfilePanel } from '@/components/profile-panel'
import { SavedRoutesPanel } from '@/components/saved-routes-panel'
import { TripHistoryPanel } from '@/components/trip-history-panel'
import { useAuth } from '@/components/auth-provider'
import { ThemeToggle } from '@/components/theme-toggle'
import { LeaderboardDialog } from '@/components/leaderboard-dialog'
import { LocationNotFoundDialog } from '@/components/location-not-found-dialog'
import { RideCompleteDialog } from '@/components/ride-complete-dialog'
import type { LeaderboardEntry } from '@/lib/leaderboard-types'
import type { WeatherResponse } from '@/lib/weather-types'
import { APP_NAME, APP_TAGLINE } from '@/lib/brand'
import { WARSAW_CENTER } from '@/lib/geo'
import { Compass, Loader2, Sparkles } from 'lucide-react'
import type { MapFocusTarget } from '@/components/scenic-map'

const ScenicMap = dynamic(() => import('@/components/scenic-map'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-muted">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

export function ScenicApp() {
  const { user, claimedTiles, trips, refresh } = useAuth()
  const [start, setStart] = useState<RouteEndpoint>(defaultStartPreset)
  const [end, setEnd] = useState<RouteEndpoint>(blankEndpoint)
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const weights = useMemo(
    () => preferencesToWeights(preferences),
    [preferences],
  )
  const [budget, setBudget] = useState(DEFAULT_ROUTE_CONSTRAINTS.budgetMinutes)
  const [minExtraKm, setMinExtraKm] = useState(0)
  const [maxExtraKm, setMaxExtraKm] = useState(DEFAULT_MAX_EXTRA_KM)
  const [userSpeedKmh, setUserSpeedKmh] = useState(DEFAULT_USER_SPEED_KMH)

  const routeConstraints = useMemo<RoutePickConstraints>(
    () => ({
      budgetMinutes: budget,
      minExtraKm,
      maxExtraKm,
      userSpeedKmh: clampUserSpeedKmh(userSpeedKmh),
    }),
    [budget, minExtraKm, maxExtraKm, userSpeedKmh],
  )

  const [data, setData] = useState<RouteResponse | null>(null)
  const [returnData, setReturnData] = useState<RouteResponse | null>(null)
  const [returnLoading, setReturnLoading] = useState(false)
  const [returnError, setReturnError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [localPastPaths, setLocalPastPaths] = useState<PastPath[]>([])
  const coverage = useMemo(() => {
    if (!user) return new Set<string>()
    return new Set(normalizeStoredTileKeys(claimedTiles))
  }, [user, claimedTiles])
  const [showCoverage, setShowCoverage] = useState(true)
  const [justAdded, setJustAdded] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveRouteLoading, setSaveRouteLoading] = useState(false)
  const [saveRouteMessage, setSaveRouteMessage] = useState<string | null>(null)
  const [sidebarEl, setSidebarEl] = useState<HTMLDivElement | null>(null)
  const [mapPickTarget, setMapPickTarget] = useState<'start' | 'end' | null>(
    null,
  )
  const [directionsOpen, setDirectionsOpen] = useState(false)
  const [mapFocus, setMapFocus] = useState<MapFocusTarget | null>(null)
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
  const [rideCompleteOpen, setRideCompleteOpen] = useState(false)
  const [rideCompletedAt, setRideCompletedAt] = useState<Date | null>(null)
  const [rideScorePct, setRideScorePct] = useState(0)
  const [rideTilesAdded, setRideTilesAdded] = useState(0)
  const startTouchedRef = useRef(false)
  const geoDefaultAppliedRef = useRef(false)

  const loopDisabled =
    isBlankEndpoint(end) || endpointsEqual(start, end)

  useEffect(() => {
    if (isScenicDetourEndpoint(end) && minExtraKm < MIN_EXTRA_KM_TO_LOCATION) {
      setMinExtraKm(MIN_EXTRA_KM_TO_LOCATION)
    }
  }, [end, minExtraKm])

  useEffect(() => {
    if (saveRouteMessage === null) return
    const t = setTimeout(() => setSaveRouteMessage(null), 2600)
    return () => clearTimeout(t)
  }, [saveRouteMessage])

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
    if (isBlankEndpoint(end) || endpointsEqual(start, end)) {
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

  const [outboundPreference, setOutboundPreference] =
    useState<ReturnPathPreference>('scenic')

  const autoChosenIndex = useMemo(() => {
    if (!data) return 0
    return pickOutboundByPreference(
      data.candidates,
      data.directIndex,
      weights,
      routeConstraints,
      outboundPreference,
    )
  }, [data, weights, routeConstraints, outboundPreference])

  const [manualChosenIndex, setManualChosenIndex] = useState<number | null>(null)

  useEffect(() => {
    setManualChosenIndex(null)
    setOutboundPreference('scenic')
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
      routeConstraints,
      chosen.coords,
      returnPreference,
    )
  }, [returnData, chosen, weights, routeConstraints, returnPreference])

  const returnIndex = manualReturnIndex ?? autoReturnIndex
  const returnLeg = returnData ? returnData.candidates[returnIndex] ?? null : null

  const alternateRoutes = useMemo(() => {
    if (!data || !direct) return []
    return data.candidates
      .map((candidate, index) => ({
        candidate,
        index,
        isDirect: index === data.directIndex,
      }))
      .filter(({ index }) => index !== chosenIndex)
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
    setOutboundPreference('scenic')
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
        routeConstraints,
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
    routeConstraints,
  ])

  const handleClearReturn = useCallback(() => {
    setReturnData(null)
    setReturnError(null)
    setManualReturnIndex(null)
    setReturnPreference('scenic')
  }, [])

  const handleChooseShortestReturn = useCallback(() => {
    if (returnData && chosen) {
      const idx = pickReturnByPreference(
        returnData.candidates,
        returnData.directIndex,
        weights,
        routeConstraints,
        chosen.coords,
        'shortest',
      )
      setReturnPreference('shortest')
      setManualReturnIndex(idx)
      return
    }
    if (!data) return
    const idx = pickOutboundByPreference(
      data.candidates,
      data.directIndex,
      weights,
      routeConstraints,
      'shortest',
    )
    setOutboundPreference('shortest')
    setManualChosenIndex(idx)
  }, [returnData, chosen, data, weights, routeConstraints])

  const handleChooseLongestReturn = useCallback(() => {
    if (returnData && chosen) {
      const idx = pickReturnByPreference(
        returnData.candidates,
        returnData.directIndex,
        weights,
        routeConstraints,
        chosen.coords,
        'longest',
      )
      setReturnPreference('longest')
      setManualReturnIndex(idx)
      return
    }
    if (!data) return
    const idx = pickOutboundByPreference(
      data.candidates,
      data.directIndex,
      weights,
      routeConstraints,
      'longest',
    )
    setOutboundPreference('longest')
    setManualChosenIndex(idx)
  }, [returnData, chosen, data, weights, routeConstraints])

  const handleSwap = useCallback(() => {
    if (isBlankEndpoint(end)) return
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

  const handleRouteFromLocation = useCallback(() => {
    if (!userPosition) return
    setStartManual(locationEndpoint(userPosition))
  }, [userPosition, setStartManual])

  const handleRouteHome = useCallback(() => {
    if (!user?.home || !isSavedAddressSet(user.home)) return
    setEnd(savedAddressToEndpoint('home', user.home))
    setMinExtraKm((prev) => Math.max(prev, MIN_EXTRA_KM_TO_LOCATION))
  }, [user?.home])

  const handleRouteWork = useCallback(() => {
    if (!user?.work || !isSavedAddressSet(user.work)) return
    setEnd(savedAddressToEndpoint('work', user.work))
    setMinExtraKm((prev) => Math.max(prev, MIN_EXTRA_KM_TO_LOCATION))
  }, [user?.work])

  const handleLoadSavedRoute = useCallback((route: SavedRouteSummary) => {
    setStart(
      customEndpoint(route.startName, 'Saved route start', {
        lat: route.startLat,
        lng: route.startLng,
      }),
    )
    setEnd(
      customEndpoint(route.endName, 'Saved route end', {
        lat: route.endLat,
        lng: route.endLng,
      }),
    )
    setPreferences(weightsToPreferences(route.weights))
    setReturnData(null)
    setReturnError(null)
    setManualReturnIndex(null)
    setManualChosenIndex(null)
  }, [])

  const handleSaveRoute = useCallback(async () => {
    if (!chosen || !user) return
    setSaveRouteLoading(true)
    setSaveRouteMessage(null)
    setSaveError(null)
    try {
      const returnSteps =
        returnLeg?.turnMarkers?.length
          ? buildDirectionSteps(returnLeg.coords, returnLeg.turnMarkers)
          : null
      const res = await fetch('/api/saved-routes', {
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
          isRoundTrip: Boolean(returnLeg),
          distanceM: returnLeg
            ? chosen.distance + returnLeg.distance
            : chosen.distance,
          durationS: returnLeg
            ? chosen.duration + returnLeg.duration
            : chosen.duration,
          outboundCoords: chosen.coords,
          returnCoords: returnLeg?.coords ?? null,
          directionSteps,
          returnDirectionSteps: returnSteps,
          weights,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not save route')
      setSaveRouteMessage('Route saved to your account')
      await refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save route')
    } finally {
      setSaveRouteLoading(false)
    }
  }, [
    chosen,
    user,
    start,
    end,
    returnLeg,
    directionSteps,
    weights,
    refresh,
  ])

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

  const handleDirectionStepSelect = useCallback((step: DirectionStep) => {
    setFollowingUser(false)
    setMapFocus({ lat: step.lat, lng: step.lng, key: Date.now() })
  }, [])

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
    const completedAt = new Date()
    const scorePct = scenicScorePercent(chosen, weights, returnLeg)
    const loopCoords = returnLeg
      ? joinLoopCoords(chosen.coords, returnLeg.coords)
      : chosen.coords
    const tiles = tileKeysForSave([...tilesForPath(loopCoords)])
    setSaveError(null)

    let tilesAdded = 0

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
        tilesAdded = data.tilesAdded ?? 0
        setJustAdded(tilesAdded)
        await refresh()
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not save ride')
        return
      }
    } else {
      setLocalPastPaths((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          coords: loopCoords,
          drivenAt: completedAt.toISOString(),
        },
      ])
      tilesAdded = 0
    }

    setRideCompletedAt(completedAt)
    setRideScorePct(scorePct)
    setRideTilesAdded(tilesAdded)
    setRideCompleteOpen(true)
    setShowCoverage(true)
  }, [chosen, returnLeg, user, start, end, weights, refresh])

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
    setLocalPastPaths([])
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
    let cancelled = false
    setWeatherLoading(true)
    setWeatherError(null)
    const url = `/api/weather?lat=${weatherLat}&lng=${weatherLng}&hours=12`
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
  }, [weatherLat, weatherLng])

  const handleOpenLeaderboard = useCallback(() => {
    setLeaderboardOpen(true)
    setShowCoverage(true)
  }, [])

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <LeaderboardDialog
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        entries={leaderboardEntries}
        loading={leaderboardLoading}
        error={leaderboardError}
        currentUserId={user?.id}
      />
      <RideCompleteDialog
        open={rideCompleteOpen}
        onClose={() => setRideCompleteOpen(false)}
        completedAt={rideCompletedAt}
        scorePct={rideScorePct}
        tilesAdded={rideTilesAdded}
        isRoundTrip={Boolean(returnLeg)}
        tilesCounted={Boolean(user)}
      />
      <LocationNotFoundDialog
        open={geoError !== null}
        onClose={() => setGeoError(null)}
        variant="geolocation"
        title={
          geoError === 'Location is not supported in this browser.'
            ? 'Location not supported'
            : undefined
        }
        message={geoError ?? undefined}
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {/* Control column */}
      <div
        ref={setSidebarEl}
        className="relative z-20 flex w-full shrink-0 flex-col gap-2 overflow-y-auto overflow-x-hidden border-b border-border bg-background p-3 lg:h-full lg:w-[480px] lg:border-b-0 lg:border-r"
      >
        <header className="flex items-center gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Compass className="size-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-semibold leading-none text-foreground">
                {APP_NAME}
              </h1>
              <p className="text-xs text-muted-foreground">
                {APP_TAGLINE}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <UserBadge />
        <AuthPanel />

        <ScenicControls
          start={start}
          end={end}
          preferences={preferences}
          budget={budget}
          minExtraKm={minExtraKm}
          maxExtraKm={maxExtraKm}
          userSpeedKmh={userSpeedKmh}
          onStart={setStartManual}
          onEnd={setEnd}
          onPreferences={setPreferences}
          onBudget={setBudget}
          onMinExtraKm={setMinExtraKm}
          onMaxExtraKm={setMaxExtraKm}
          onUserSpeedKmh={setUserSpeedKmh}
          onSwap={handleSwap}
          menuContainer={sidebarEl}
          mapPickTarget={mapPickTarget}
          onMapPickRequest={handleMapPickRequest}
          userPosition={geoAvailable ? userPosition : null}
          onRouteFromLocation={
            geoAvailable && userPosition ? handleRouteFromLocation : undefined
          }
          onRouteHome={handleRouteHome}
          onRouteWork={handleRouteWork}
          showRouteHome={isSavedAddressSet(user?.home)}
          showRouteWork={isSavedAddressSet(user?.work)}
        />

        <div className="rounded-xl border border-border bg-card p-4">
          {isBlankEndpoint(end) ? (
            <p className="text-sm text-muted-foreground">
              Choose a destination to plot a ride.
            </p>
          ) : endpointsEqual(start, end) ? (
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
                pathPreference={outboundPreference}
                userSpeedKmh={routeConstraints.userSpeedKmh}
                onFindReturn={handleFindReturn}
                onClearReturn={handleClearReturn}
                onChooseShortestReturn={handleChooseShortestReturn}
                onChooseLongestReturn={handleChooseLongestReturn}
                onSaveRoute={user ? handleSaveRoute : undefined}
                returnLoading={returnLoading}
                saveRouteLoading={saveRouteLoading}
                saveRouteMessage={saveRouteMessage}
                loopDisabled={loopDisabled}
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
          canRide={Boolean(chosen)}
          onOpenLeaderboard={handleOpenLeaderboard}
          leaderboardOpen={leaderboardOpen}
        />

        <ProfilePanel />
        <SavedRoutesPanel onLoadRoute={handleLoadSavedRoute} />

        {saveError ? (
          <p className="text-sm text-destructive" role="alert">
            {saveError}
          </p>
        ) : null}

        <TripHistoryPanel />

        {data ? (
          <p
            className={`flex items-center gap-1.5 text-xs ${
              data.routingWarning ? 'text-amber-700 dark:text-amber-300' : 'text-muted-foreground'
            }`}
            role={data.routingWarning ? 'alert' : undefined}
          >
            <Sparkles className="size-3.5 shrink-0 text-accent-foreground" aria-hidden />
            {data.routingWarning
              ? data.routingWarning
              : data.source === 'graphhopper'
                ? 'Cycling routes from GraphHopper bike profile (OpenStreetMap)'
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
          weather={weather}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
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
          userSpeedKmh={routeConstraints.userSpeedKmh}
          pastPaths={pastPaths}
          returnRoute={returnLeg}
          leaderboardOpen={leaderboardOpen}
          leaderboardEntries={leaderboardEntries}
          mapFocus={mapFocus}
          hideEndMarker={isBlankEndpoint(end)}
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
          onStepSelect={handleDirectionStepSelect}
        />
      </div>
      </div>
    </main>
  )
}
