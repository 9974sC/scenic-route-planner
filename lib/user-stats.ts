import type { TripSummary } from '@/lib/auth-types'
import { totalTiles } from '@/lib/geo'
import { fmtCoveragePct } from '@/lib/trip-stats'

function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Distinct calendar days with at least one logged ride. */
export function activeDayKeys(trips: TripSummary[]): Set<string> {
  const keys = new Set<string>()
  for (const trip of trips) {
    keys.add(dayKey(new Date(trip.drivenAt)))
  }
  return keys
}

/** Consecutive days with activity ending today or yesterday. */
export function usageStreakDays(trips: TripSummary[], now = new Date()): number {
  const days = activeDayKeys(trips)
  if (!days.size) return 0

  let cursor = startOfDay(now)
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (days.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export type UserLifetimeStats = {
  tripCount: number
  totalDistanceM: number
  totalDurationS: number
  tilesClaimed: number
  coveragePct: number
  usageStreakDays: number
}

export function computeLifetimeStats(
  trips: TripSummary[],
  tilesClaimed: number,
  gridTotal = totalTiles(),
): UserLifetimeStats {
  const totalDistanceM = trips.reduce((sum, t) => sum + t.distanceM, 0)
  const totalDurationS = trips.reduce((sum, t) => sum + t.durationS, 0)

  return {
    tripCount: trips.length,
    totalDistanceM,
    totalDurationS,
    tilesClaimed,
    coveragePct: gridTotal > 0 ? (tilesClaimed / gridTotal) * 100 : 0,
    usageStreakDays: usageStreakDays(trips),
  }
}

export function fmtMemberSince(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export { fmtCoveragePct }
