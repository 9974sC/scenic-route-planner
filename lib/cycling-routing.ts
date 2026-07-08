import type { LatLng } from '@/lib/types'
import { WARSAW_BBOX } from '@/lib/geo'

/** Typical leisure cycling pace used for simulated ETAs (km/h). */
export const CYCLING_SPEED_KMH = 20

/** Upper bound for custom-model speed caps and sanity checks. */
export const CYCLING_SPEED_MAX_KMH = 25

export const CYCLING_SPEED_MS = (CYCLING_SPEED_KMH * 1000) / 3600

/**
 * GraphHopper custom model for paid/flexible plans only.
 * Free API keys reject POST requests that set ch.disable or custom_model.
 */
export const GRAPHHOPPER_BIKE_CUSTOM_MODEL = {
  priority: [
    { if: 'road_class == MOTORWAY', multiply_by: '0' },
    { if: 'road_class == TRUNK', multiply_by: '0' },
    { if: 'road_environment == TUNNEL', multiply_by: '0' },
    { if: 'road_environment == FERRY', multiply_by: '0' },
    { if: 'road_class == STEPS', multiply_by: '0' },
    { if: 'road_access == NO', multiply_by: '0' },
    { if: 'road_access == PRIVATE', multiply_by: '0.05' },
  ],
  speed: [
    {
      if: 'true',
      limit_to: String(CYCLING_SPEED_MAX_KMH),
    },
  ],
}

export const GRAPHHOPPER_SNAP_PREVENTIONS = [
  'motorway',
  'trunk',
  'tunnel',
  'ferry',
] as const

/** Standard bike routing URL — works on GraphHopper free tier. */
export function graphHopperCyclingUrl(start: LatLng, end: LatLng, key: string) {
  const url = new URL('https://graphhopper.com/api/1/route')
  url.searchParams.set('point', `${start.lat},${start.lng}`)
  url.searchParams.append('point', `${end.lat},${end.lng}`)
  url.searchParams.set('profile', 'bike')
  url.searchParams.set('points_encoded', 'false')
  url.searchParams.set('elevation', 'true')
  url.searchParams.set('instructions', 'true')
  url.searchParams.set('algorithm', 'alternative_route')
  url.searchParams.set('alternative_route.max_paths', '6')
  url.searchParams.set('alternative_route.max_weight_factor', '5')
  url.searchParams.set('alternative_route.max_share_factor', '0.35')
  url.searchParams.set('key', key)
  return url.toString()
}

/** Flexible-mode POST body — only for paid GraphHopper plans. */
export function graphHopperCyclingRequestBody(start: LatLng, end: LatLng) {
  return {
    points: [
      [start.lng, start.lat],
      [end.lng, end.lat],
    ],
    profile: 'bike',
    points_encoded: false,
    elevation: true,
    instructions: true,
    algorithm: 'alternative_route',
    'alternative_route.max_paths': 6,
    'alternative_route.max_weight_factor': 5,
    'alternative_route.max_share_factor': 0.35,
    'ch.disable': true,
    custom_model: GRAPHHOPPER_BIKE_CUSTOM_MODEL,
    snap_preventions: [...GRAPHHOPPER_SNAP_PREVENTIONS],
  }
}

export function isGraphHopperFlexibleModeError(message: string): boolean {
  return /flexible mode/i.test(message)
}

export function durationFromDistanceM(distanceM: number): number {
  return distanceM / CYCLING_SPEED_MS
}
