import type { LatLng } from './types'
import type { RouteEndpoint } from './places'
import {
  addressPickerPlaceholder,
  isUnsetAddressPicker,
  savedAddressEndpoint,
} from './places'

export type SavedAddress = {
  name: string
  lat: number
  lng: number
}

export function isSavedAddressSet(
  addr: SavedAddress | null | undefined,
): addr is SavedAddress {
  return Boolean(
    addr &&
      typeof addr.name === 'string' &&
      addr.name.trim() &&
      Number.isFinite(addr.lat) &&
      Number.isFinite(addr.lng),
  )
}

export function savedAddressFromRow(
  name: string | null,
  lat: number | null,
  lng: number | null,
): SavedAddress | null {
  if (name == null || lat == null || lng == null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const trimmed = name.trim()
  if (!trimmed) return null
  return { name: trimmed, lat, lng }
}

export function validateSavedAddress(
  addr: SavedAddress | null | undefined,
): string | null {
  if (!addr) return null
  const name = addr.name.trim()
  if (!name) return 'Address needs a label'
  if (name.length > 80) return 'Address label must be 80 characters or fewer'
  if (!Number.isFinite(addr.lat) || addr.lat < -90 || addr.lat > 90) {
    return 'Invalid latitude'
  }
  if (!Number.isFinite(addr.lng) || addr.lng < -180 || addr.lng > 180) {
    return 'Invalid longitude'
  }
  return null
}

export function savedAddressToEndpoint(
  kind: 'home' | 'work',
  addr: SavedAddress,
): RouteEndpoint {
  return savedAddressEndpoint(kind, addr.name, {
    lat: addr.lat,
    lng: addr.lng,
  })
}

export function endpointToSavedAddress(
  endpoint: RouteEndpoint,
): SavedAddress | null {
  if (isUnsetAddressPicker(endpoint)) return null
  return {
    name: endpoint.name,
    lat: endpoint.point.lat,
    lng: endpoint.point.lng,
  }
}

export function savedAddressToPickerValue(
  kind: 'home' | 'work',
  addr: SavedAddress | null | undefined,
): RouteEndpoint {
  if (!isSavedAddressSet(addr)) return addressPickerPlaceholder(kind)
  return savedAddressToEndpoint(kind, addr)
}

export function pointFromSavedAddress(addr: SavedAddress): LatLng {
  return { lat: addr.lat, lng: addr.lng }
}
