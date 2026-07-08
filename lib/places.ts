import type { LatLng, Place } from './types'
import { haversine } from './geo'
import { PLACES } from './scenic'

export type RouteEndpoint = Place & { custom?: boolean }

export function presetById(id: string): Place | undefined {
  return PLACES.find((p) => p.id === id)
}

export function endpointsEqual(a: RouteEndpoint, b: RouteEndpoint): boolean {
  if (a.id === b.id) return true
  return haversine(a.point, b.point) < 40
}

export function filterPresets(query: string): RouteEndpoint[] {
  const q = query.trim().toLowerCase()
  if (!q) return PLACES
  return PLACES.filter(
    (p) =>
      p.name.toLowerCase().includes(q) || p.hint.toLowerCase().includes(q),
  )
}

export function customEndpoint(
  name: string,
  hint: string,
  point: LatLng,
): RouteEndpoint {
  return {
    id: `custom:${point.lat.toFixed(5)},${point.lng.toFixed(5)}`,
    name,
    hint,
    point,
    custom: true,
  }
}

/** Parse "52.23, 21.01" style coordinates. */
export function parseCoordinateQuery(text: string): RouteEndpoint | null {
  const match = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
  if (!match) return null

  const lat = Number(match[1])
  const lng = Number(match[2])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return customEndpoint(
    'Custom pin',
    `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    { lat, lng },
  )
}

export function mapPickEndpoint(point: LatLng): RouteEndpoint {
  return customEndpoint(
    'Map pin',
    `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`,
    point,
  )
}

export const LOCATION_ENDPOINT_ID = 'current-location'

export function locationEndpoint(point: LatLng): RouteEndpoint {
  return {
    id: LOCATION_ENDPOINT_ID,
    name: 'Your location',
    hint: 'Live GPS position',
    point,
    custom: true,
  }
}

export function isLocationEndpoint(endpoint: RouteEndpoint): boolean {
  return endpoint.id === LOCATION_ENDPOINT_ID
}

