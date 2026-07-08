import type { ElevationStats, Place, RouteCandidate, ScenicWeights } from './types'
import { clamp01 } from './geo'
import { pathOverlapRatio } from './route-overlap'

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

/** Maximum extra minutes the scenic picker may spend over the fastest route. */
export const MAX_SPARE_MINUTES = 180

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
 * With a large budget, prefer longer detours among similarly scenic options.
 */
export function pickScenic(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  budgetMinutes: number,
): number {
  const direct = candidates[directIndex]
  const eligible: { index: number; score: number; extraMin: number }[] = []

  candidates.forEach((c, i) => {
    const extraMin = (c.duration - direct.duration) / 60
    if (extraMin > budgetMinutes + 0.5) return
    eligible.push({
      index: i,
      score: weightedScenic(c, weights),
      extraMin,
    })
  })

  if (!eligible.length) return directIndex

  eligible.sort((a, b) => b.score - a.score)
  const topScore = eligible[0].score
  const useDetourBias = budgetMinutes >= 45
  const scoreFloor = topScore * (useDetourBias ? 0.93 : 0.995)

  const finalists = eligible.filter((e) => e.score >= scoreFloor)
  if (useDetourBias) {
    finalists.sort((a, b) => b.extraMin - a.extraMin || b.score - a.score)
  } else {
    finalists.sort((a, b) => b.score - a.score)
  }

  return finalists[0]?.index ?? directIndex
}

/**
 * Pick a return leg that forms a loop: scenic within budget, minimal overlap
 * with the outbound path (avoids backtracking and parallel duplicates).
 */
export type ReturnPathPreference = 'scenic' | 'longest' | 'shortest'

function eligibleReturnIndices(
  candidates: RouteCandidate[],
  directIndex: number,
  budgetMinutes: number,
): number[] {
  const direct = candidates[directIndex]
  const indices: number[] = []

  candidates.forEach((c, i) => {
    const extraMin = (c.duration - direct.duration) / 60
    if (extraMin <= budgetMinutes + 0.5) indices.push(i)
  })

  return indices.length ? indices : [directIndex]
}

export function pickReturnByPreference(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  budgetMinutes: number,
  outboundCoords: [number, number][],
  preference: ReturnPathPreference,
): number {
  const pool = eligibleReturnIndices(candidates, directIndex, budgetMinutes)

  if (preference === 'shortest') {
    return pool.reduce(
      (best, i) => (candidates[i].distance < candidates[best].distance ? i : best),
      pool[0],
    )
  }

  if (preference === 'longest') {
    return pool.reduce(
      (best, i) => (candidates[i].distance > candidates[best].distance ? i : best),
      pool[0],
    )
  }

  return pickReturnRoute(
    candidates,
    directIndex,
    weights,
    budgetMinutes,
    outboundCoords,
  )
}

export function pickReturnRoute(
  candidates: RouteCandidate[],
  directIndex: number,
  weights: ScenicWeights,
  budgetMinutes: number,
  outboundCoords: [number, number][],
): number {
  const direct = candidates[directIndex]
  const eligible: {
    index: number
    scenic: number
    overlap: number
    loopScore: number
  }[] = []

  for (const i of eligibleReturnIndices(candidates, directIndex, budgetMinutes)) {
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
  budgetMinutes: number,
  outboundCoords: [number, number][],
): number[] {
  const ranked: { index: number; loopScore: number; overlap: number }[] = []

  for (const i of eligibleReturnIndices(candidates, directIndex, budgetMinutes)) {
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
