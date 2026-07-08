import type { TripSummary } from '@/lib/auth-types'
import { totalTiles } from '@/lib/geo'

export type TripWindowDays = 3 | 7

export type TripPeriodStats = {
  tripCount: number
  distanceM: number
  durationS: number
  avgSpeedKmh: number | null
  avgCoveragePct: number
}

/** Share of the Warsaw grid newly lit by this drive. */
export function tripCoveragePct(tilesAdded: string[], gridTotal = totalTiles()): number {
  if (!gridTotal || !tilesAdded.length) return 0
  return (tilesAdded.length / gridTotal) * 100
}

export function tripsWithinDays(trips: TripSummary[], days: TripWindowDays): TripSummary[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
  return trips.filter((trip) => new Date(trip.drivenAt).getTime() >= cutoff)
}

export function aggregateTripStats(
  trips: TripSummary[],
  days: TripWindowDays,
  gridTotal = totalTiles(),
): TripPeriodStats {
  const inWindow = tripsWithinDays(trips, days)
  const distanceM = inWindow.reduce((sum, t) => sum + t.distanceM, 0)
  const durationS = inWindow.reduce((sum, t) => sum + t.durationS, 0)

  const avgSpeedKmh =
    durationS > 0 ? (distanceM / 1000) / (durationS / 3600) : null

  const avgCoveragePct = inWindow.length
    ? inWindow.reduce((sum, t) => sum + tripCoveragePct(t.tilesAdded, gridTotal), 0) /
      inWindow.length
    : 0

  return {
    tripCount: inWindow.length,
    distanceM,
    durationS,
    avgSpeedKmh,
    avgCoveragePct,
  }
}

export function fmtSpeedKmh(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`
}

export function fmtCoveragePct(pct: number): string {
  if (pct > 0 && pct < 0.05) return '<0.1%'
  return `${pct.toFixed(pct >= 10 ? 1 : 2)}%`
}
