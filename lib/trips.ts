import type { Trip } from '@/lib/db/schema'
import type { TripSummary } from '@/lib/auth-types'

export function tripToSummary(trip: Trip): TripSummary {
  return {
    id: trip.id,
    startName: trip.startName,
    endName: trip.endName,
    distanceM: trip.distanceM,
    durationS: trip.durationS,
    tilesAdded: trip.tilesAdded,
    drivenAt:
      trip.drivenAt instanceof Date
        ? trip.drivenAt.toISOString()
        : String(trip.drivenAt),
  }
}
