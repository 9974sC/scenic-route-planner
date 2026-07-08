import type { LatLng, Place } from './types'
import { haversine, WARSAW_CENTER } from './geo'
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
export const BLANK_ENDPOINT_ID = 'blank-destination'

export function defaultStartPreset(): RouteEndpoint {
  const centralna = presetById('centralna')
  return centralna ?? PLACES[0]
}

export function blankEndpoint(): RouteEndpoint {
  return {
    id: BLANK_ENDPOINT_ID,
    name: 'Choose destination',
    hint: 'Search, pick on map, or select a place',
    point: WARSAW_CENTER,
    custom: true,
  }
}

export function isBlankEndpoint(endpoint: RouteEndpoint): boolean {
  return endpoint.id === BLANK_ENDPOINT_ID
}

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

export const HOME_ENDPOINT_ID = 'saved-home'
export const WORK_ENDPOINT_ID = 'saved-work'

export function addressPickerPlaceholder(kind: 'home' | 'work'): RouteEndpoint {
  return {
    id: `address-unset-${kind}`,
    name: 'Not set',
    hint: 'Search or pick on map',
    point: WARSAW_CENTER,
    custom: true,
  }
}

export function isUnsetAddressPicker(endpoint: RouteEndpoint): boolean {
  return endpoint.id === 'address-unset-home' || endpoint.id === 'address-unset-work'
}

export function savedAddressEndpoint(
  kind: 'home' | 'work',
  name: string,
  point: LatLng,
): RouteEndpoint {
  return {
    id: kind === 'home' ? HOME_ENDPOINT_ID : WORK_ENDPOINT_ID,
    name,
    hint: kind === 'home' ? 'Home' : 'Work',
    point,
    custom: true,
  }
}

export function isHomeEndpoint(endpoint: RouteEndpoint): boolean {
  return endpoint.id === HOME_ENDPOINT_ID
}

export function isWorkEndpoint(endpoint: RouteEndpoint): boolean {
  return endpoint.id === WORK_ENDPOINT_ID
}

/** Destinations that use the scenic detour minimum (home, work, live location). */
export function isScenicDetourEndpoint(endpoint: RouteEndpoint): boolean {
  return (
    isLocationEndpoint(endpoint) ||
    isHomeEndpoint(endpoint) ||
    isWorkEndpoint(endpoint)
  )
}

