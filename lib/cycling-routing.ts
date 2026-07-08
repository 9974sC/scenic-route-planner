import type { LatLng } from '@/lib/types'

/** Typical leisure cycling pace used for simulated ETAs (km/h). */
export const CYCLING_SPEED_KMH = 20

export const CYCLING_SPEED_MS = (CYCLING_SPEED_KMH * 1000) / 3600

/**
 * Standard GraphHopper GET /route with profile=bike.
 * Works on the free plan (no custom_model or flexible POST).
 */
export function graphHopperCyclingUrl(
  start: LatLng,
  end: LatLng,
  key: string,
  options?: { alternatives?: boolean },
) {
  const url = new URL('https://graphhopper.com/api/1/route')
  url.searchParams.set('point', `${start.lat},${start.lng}`)
  url.searchParams.append('point', `${end.lat},${end.lng}`)
  url.searchParams.set('profile', 'bike')
  url.searchParams.set('points_encoded', 'false')
  url.searchParams.set('elevation', 'true')
  url.searchParams.set('instructions', 'true')
  if (options?.alternatives !== false) {
    const maxPaths = graphHopperMaxAlternatives()
    url.searchParams.set('algorithm', 'alternative_route')
    url.searchParams.set('alternative_route.max_paths', String(maxPaths))
    url.searchParams.set('alternative_route.max_weight_factor', '5')
    url.searchParams.set('alternative_route.max_share_factor', '0.35')
  }
  url.searchParams.set('key', key)
  return url.toString()
}

export function isGraphHopperAuthError(message: string): boolean {
  return /wrong credentials|invalid.*api key|unauthorized/i.test(message)
}

export function isGraphHopperQuotaError(message: string): boolean {
  return /limit|quota|429|too many/i.test(message)
}

/** Strip whitespace and accidental wrapping quotes from dashboard copy-paste. */
export function getGraphHopperApiKey(): string | null {
  const raw = process.env.GRAPHHOPPER_API_KEY?.trim()
  if (!raw) return null
  const key = raw.replace(/^['"]|['"]$/g, '').trim()
  return key || null
}

/** Default 3 on free tier to conserve daily credits (500/day). */
export function graphHopperMaxAlternatives(): number {
  const raw = process.env.GRAPHHOPPER_MAX_ALTERNATIVES?.trim()
  const n = raw ? Number(raw) : 3
  if (!Number.isFinite(n)) return 3
  return Math.max(1, Math.min(6, Math.round(n)))
}

export function graphHopperAlternativesEnabled(): boolean {
  return process.env.GRAPHHOPPER_ALTERNATIVES !== 'false'
}

export function durationFromDistanceM(distanceM: number): number {
  return distanceM / CYCLING_SPEED_MS
}
