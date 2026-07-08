import type { TripSummary } from '@/lib/auth-types'

export type PastPath = {
  id: string
  coords: [number, number][]
  drivenAt: string
}

const MIN_OPACITY = 0.12
const MAX_OPACITY = 0.52

/** Resolve drawable coordinates for a saved trip. */
export function resolveTripCoords(trip: TripSummary): [number, number][] {
  if (trip.routeCoords.length >= 2) return trip.routeCoords
  return [
    [trip.startLat, trip.startLng],
    [trip.endLat, trip.endLng],
  ]
}

export function tripToPastPath(trip: TripSummary): PastPath | null {
  const coords = resolveTripCoords(trip)
  if (coords.length < 2) return null
  return {
    id: trip.id,
    coords,
    drivenAt: trip.drivenAt,
  }
}

/** Older paths are more transparent; newest path in the set is most visible. */
export function opacityForPastPath(
  drivenAt: string,
  paths: PastPath[],
): number {
  if (!paths.length) return MAX_OPACITY

  let oldest = Infinity
  let newest = -Infinity
  for (const path of paths) {
    const t = new Date(path.drivenAt).getTime()
    if (t < oldest) oldest = t
    if (t > newest) newest = t
  }

  const t = new Date(drivenAt).getTime()
  if (newest === oldest) return (MIN_OPACITY + MAX_OPACITY) / 2

  const recency = (t - oldest) / (newest - oldest)
  return MIN_OPACITY + recency * (MAX_OPACITY - MIN_OPACITY)
}

export function parseRouteCoords(raw: unknown): [number, number][] | null {
  if (!Array.isArray(raw) || raw.length < 2) return null

  const coords: [number, number][] = []
  for (const point of raw) {
    if (!Array.isArray(point) || point.length < 2) return null
    const lat = point[0]
    const lng = point[1]
    if (typeof lat !== 'number' || typeof lng !== 'number') return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    coords.push([lat, lng])
  }

  return coords.length >= 2 ? coords : null
}
