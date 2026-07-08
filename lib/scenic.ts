import type { ElevationStats, Place, RouteCandidate, ScenicWeights } from './types'
import { clamp01 } from './geo'
import { pathOverlapRatio } from './route-overlap'

export const PLACES: Place[] = [
  {
    id: 'centralna',
    name: 'Warszawa Centralna',
    hint: 'Central railway station',
    point: { lat: 52.2288, lng: 21.0033 },
  },
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

/** Maximum extra minutes the scenic picker may spend over the fastest route. */
export const MAX_SPARE_MINUTES = 180

/** Default and maximum extra distance (km) for scenic detours. */
export const DEFAULT_MAX_EXTRA_KM = 100
export const MAX_EXTRA_KM_LIMIT = 500

export const EXTRA_KM_MIN_OPTIONS = [0, 1, 2, 5, 10] as const
export const MIN_EXTRA_KM_TO_LOCATION = 5
export const EXTRA_KM_MAX_OPTIONS = [
  5, 10, 15, 25, 50, 75, 100, 150, 200, 250, 300, 400, 500,
] as const

export const DEFAULT_USER_SPEED_KMH = 15
export const MIN_USER_SPEED_KMH = 5
export const MAX_USER_SPEED_KMH = 40

export type RoutePickConstraints = {
  budgetMinutes: number
  minExtraKm: number
  maxExtraKm: number
  userSpeedKmh: number
}

export const DEFAULT_ROUTE_CONSTRAINTS: RoutePickConstraints = {
  budgetMinutes: 20,
  minExtraKm: 0,
  maxExtraKm: DEFAULT_MAX_EXTRA_KM,
  userSpeedKmh: DEFAULT_USER_SPEED_KMH,
}

/** Duration at a constant cycling speed (seconds). */
export function durationAtSpeed(distanceM: number, speedKmh: number): number {
  if (speedKmh <= 0) return Number.POSITIVE_INFINITY
  return (distanceM / 1000 / speedKmh) * 3600
}

export function adjustedDuration(
  candidate: RouteCandidate,
  userSpeedKmh: number,
): number {
  return durationAtSpeed(candidate.distance, userSpeedKmh)
}

export function extraDistanceKm(
  candidate: RouteCandidate,
  direct: RouteCandidate,
): number {
  return Math.max(0, (candidate.distance - direct.distance) / 1000)
}

export function extraDurationMinutes(
  candidate: RouteCandidate,
  direct: RouteCandidate,
  userSpeedKmh: number,
): number {
  return (
    (adjustedDuration(candidate, userSpeedKmh) -
      adjustedDuration(direct, userSpeedKmh)) /
    60
  )
}

export function fmtDurationDelta(secondsDelta: number): string {
  const min = Math.round(secondsDelta / 60)
  if (min === 0) return '0 min'
  if (min > 0) return `+${min} min`
  return `${min} min`
}

export function fmtDistanceDelta(metersDelta: number): string {
  const km = metersDelta / 1000
  if (Math.abs(km) < 0.05) return '0 km'
  const abs =
    Math.abs(km) >= 10 ? Math.round(Math.abs(km)) : Math.round(Math.abs(km) * 10) / 10
  if (km > 0) return `+${abs} km`
  return `-${abs} km`
}

/** CSS tone for a delta vs the selected route (more = warmer, less = greener). */
export function deltaTone(
  delta: number,
  sameThreshold: number,
): 'more' | 'less' | 'same' {
  if (Math.abs(delta) < sameThreshold) return 'same'
  return delta > 0 ? 'more' : 'less'
}

export function deltaToneClass(tone: 'more' | 'less' | 'same'): string {
  switch (tone) {
    case 'more':
      return 'text-amber-700 dark:text-amber-200'
    case 'less':
      return 'text-green-700 dark:text-green-200'
    default:
      return 'text-muted-foreground'
  }
}

function allCandidateIndices(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i)
}

function pickShortestIndex(
  candidates: RouteCandidate[],
  pool: number[],
): number {
  return pool.reduce(
    (best, i) => (candidates[i].distance < candidates[best].distance ? i : best),
    pool[0],
  )
}

function pickLongestIndex(
  candidates: RouteCandidate[],
  pool: number[],
): number {
  return pool.reduce(
    (best, i) => (candidates[i].distance > candidates[best].distance ? i : best),
    pool[0],
  )
}

export function fmtExtraKmLabel(km: number): string {
  return `${km} km`
}

export function clampMaxExtraKm(km: number): number {
  if (!Number.isFinite(km)) return DEFAULT_MAX_EXTRA_KM
  return Math.max(1, Math.min(MAX_EXTRA_KM_LIMIT, Math.round(km)))
}

export function clampUserSpeedKmh(speed: number): number {
  if (!Number.isFinite(speed)) return DEFAULT_USER_SPEED_KMH
  return Math.max(MIN_USER_SPEED_KMH, Math.min(MAX_USER_SPEED_KMH, speed))
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

/** Whole-number scenic score for a completed ride (0–100). */
export function scenicScorePercent(
  chosen: Pick<RouteCandidate, 'greenness' | 'curviness' | 'viewpoints'>,
  weights: ScenicWeights,
  returnLeg?: Pick<RouteCandidate, 'greenness' | 'curviness' | 'viewpoints'> | null,
): number {
  const outbound = weightedScenic(chosen, weights)
  if (!returnLeg) return Math.round(outbound * 100)
  const inbound = weightedScenic(returnLeg, weights)
  return Math.round(((outbound + inbound) / 2) * 100)
}

/**
 * Pick the winning scenic route: highest weighted scenic score among
 * candidates whose extra time over the fastest route fits the budget.
 * With a large budget, prefer longer detours among similarly scenic options.
 */
export function pickScenic(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  constraints: RoutePickConstraints,
): number {
  const direct = candidates[directIndex]
  const eligible: { index: number; score: number; extraMin: number }[] = []

  candidates.forEach((c, i) => {
    if (!candidateEligible(c, direct, constraints)) return
    const extraMin = extraDurationMinutes(c, direct, constraints.userSpeedKmh)
    eligible.push({
      index: i,
      score: weightedScenic(c, weights),
      extraMin,
    })
  })

  if (!eligible.length) return directIndex

  eligible.sort((a, b) => b.score - a.score)
  const topScore = eligible[0].score
  const useDetourBias = constraints.budgetMinutes >= 45
  const scoreFloor = topScore * (useDetourBias ? 0.93 : 0.995)

  const finalists = eligible.filter((e) => e.score >= scoreFloor)
  if (useDetourBias) {
    finalists.sort((a, b) => b.extraMin - a.extraMin || b.score - a.score)
  } else {
    finalists.sort((a, b) => b.score - a.score)
  }

  return finalists[0]?.index ?? directIndex
}

/** Pick outbound route by scenic, shortest, or longest. Shortest/longest use all candidates. */
export function pickOutboundByPreference(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  constraints: RoutePickConstraints,
  preference: ReturnPathPreference,
): number {
  const all = allCandidateIndices(candidates.length)

  if (preference === 'shortest') {
    return pickShortestIndex(candidates, all)
  }

  if (preference === 'longest') {
    return pickLongestIndex(candidates, all)
  }

  return pickScenic(candidates, directIndex, weights, constraints)
}

/**
 * Pick a return leg that forms a loop: scenic within budget, minimal overlap
 * with the outbound path (avoids backtracking and parallel duplicates).
 */
export type ReturnPathPreference = 'scenic' | 'longest' | 'shortest'

function candidateEligible(
  candidate: RouteCandidate,
  direct: RouteCandidate,
  constraints: RoutePickConstraints,
): boolean {
  const extraMin = extraDurationMinutes(
    candidate,
    direct,
    constraints.userSpeedKmh,
  )
  if (extraMin > constraints.budgetMinutes + 0.5) return false

  const extraKm = extraDistanceKm(candidate, direct)
  if (extraKm < constraints.minExtraKm - 0.05) return false
  if (extraKm > constraints.maxExtraKm + 0.05) return false

  return true
}

function eligibleReturnIndices(
  candidates: RouteCandidate[],
  directIndex: number,
  constraints: RoutePickConstraints,
): number[] {
  const direct = candidates[directIndex]
  const indices: number[] = []

  candidates.forEach((c, i) => {
    if (candidateEligible(c, direct, constraints)) indices.push(i)
  })

  return indices.length ? indices : [directIndex]
}

export function pickReturnByPreference(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  constraints: RoutePickConstraints,
  outboundCoords: [number, number][],
  preference: ReturnPathPreference,
): number {
  const all = allCandidateIndices(candidates.length)

  if (preference === 'shortest') {
    return pickShortestIndex(candidates, all)
  }

  if (preference === 'longest') {
    return pickLongestIndex(candidates, all)
  }

  return pickReturnRoute(
    candidates,
    directIndex,
    weights,
    constraints,
    outboundCoords,
  )
}

export function pickReturnRoute(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  constraints: RoutePickConstraints,
  outboundCoords: [number, number][],
): number {
  const direct = candidates[directIndex]
  const eligible: {
    index: number
    scenic: number
    overlap: number
    loopScore: number
  }[] = []

  for (const i of eligibleReturnIndices(candidates, directIndex, constraints)) {
    const c = candidates[i]
    const scenic = weightedScenic(c, weights)
    const overlap = pathOverlapRatio(outboundCoords, c.coords)
    const loopScore = scenic * (1 - overlap) ** 2 + (1 - overlap) * 0.3

    eligible.push({ index: i, scenic, overlap, loopScore })
  }

  if (!eligible.length) return directIndex

  eligible.sort(
    (a, b) =>
      b.loopScore - a.loopScore ||
      a.overlap - b.overlap ||
      b.scenic - a.scenic,
  )

  return eligible[0].index
}

/** Rank return candidates best-first for loop quality. */
export function rankReturnCandidates(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  constraints: RoutePickConstraints,
  outboundCoords: [number, number][],
): number[] {
  const ranked: { index: number; loopScore: number; overlap: number }[] = []

  for (const i of eligibleReturnIndices(candidates, directIndex, constraints)) {
    const c = candidates[i]
    const scenic = weightedScenic(c, weights)
    const overlap = pathOverlapRatio(outboundCoords, c.coords)
    const loopScore = scenic * (1 - overlap) ** 2 + (1 - overlap) * 0.3
    ranked.push({ index: i, loopScore, overlap })
  }

  if (!ranked.length) return [directIndex]

  ranked.sort(
    (a, b) =>
      b.loopScore - a.loopScore ||
      a.overlap - b.overlap,
  )
  return ranked.map((r) => r.index)
}

export function fmtSpareMinutes(minutes: number): string {
  if (minutes <= 0) return 'Direct'
  if (minutes < 60) return `+${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `+${h} h ${m} min` : `+${h} h`
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
