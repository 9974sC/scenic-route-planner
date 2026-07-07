import type { ElevationStats, Place, RouteCandidate, ScenicWeights } from './types'
import { clamp01 } from './geo'

export const PLACES: Place[] = [
  { id: 'oldtown', name: 'Old Town', hint: 'Market Square', point: { lat: 52.2497, lng: 21.0122 } },
  { id: 'lazienki', name: 'Łazienki Park', hint: 'Royal gardens', point: { lat: 52.2149, lng: 21.0356 } },
  { id: 'kabaty', name: 'Kabaty Forest', hint: 'Southern woods', point: { lat: 52.13, lng: 21.07 } },
  { id: 'kampinos', name: 'Kampinos Edge', hint: 'NW national park', point: { lat: 52.32, lng: 20.84 } },
  { id: 'vistula', name: 'Vistula Boulevards', hint: 'Riverside', point: { lat: 52.24, lng: 21.03 } },
  { id: 'wilanow', name: 'Wilanów Palace', hint: 'Baroque south', point: { lat: 52.165, lng: 21.09 } },
  { id: 'bielany', name: 'Bielany Forest', hint: 'Northern woods', point: { lat: 52.29, lng: 20.94 } },
  { id: 'praga', name: 'Praga District', hint: 'East bank', point: { lat: 52.2528, lng: 21.0353 } },
]

export const DEFAULT_WEIGHTS: ScenicWeights = {
  greenness: 0.6,
  curviness: 0.45,
  viewpoints: 0.35,
}

/** weighted scenic score 0..1 given a candidate's raw metrics */
export function weightedScenic(
  c: Pick<RouteCandidate, 'greenness' | 'curviness' | 'viewpoints'>,
  w: ScenicWeights,
): number {
  const total = w.greenness + w.curviness + w.viewpoints || 1
  return clamp01(
    (w.greenness * c.greenness +
      w.curviness * c.curviness +
      w.viewpoints * c.viewpoints) /
      total,
  )
}

/**
 * Pick the winning scenic route: highest weighted scenic score among
 * candidates whose extra time over the fastest route fits the budget.
 */
export function pickScenic(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  budgetMinutes: number,
): number {
  const direct = candidates[directIndex]
  let bestIdx = directIndex
  let bestScore = -1
  candidates.forEach((c, i) => {
    const extraMin = (c.duration - direct.duration) / 60
    if (extraMin > budgetMinutes + 0.5) return
    const score = weightedScenic(c, weights)
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  })
  return bestIdx
}

export function fmtDuration(seconds: number): string {
  const m = Math.round(seconds / 60)
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  return `${h} h ${m % 60} min`
}

export function fmtDistance(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`
}

export function fmtElevationRange(elevation: ElevationStats): string {
  return `${elevation.min}–${elevation.max} m`
}

export function fmtBiggestHill(elevation: ElevationStats): string {
  return `+${elevation.biggestHill} m hill`
}
