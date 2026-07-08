import type { Trip } from '@/lib/db/schema'
import type { TripSummary } from '@/lib/auth-types'

export function tripToSummary(trip: Trip): TripSummary {
  return {
    id: trip.id,
    startName: trip.startName,
    startLat: trip.startLat,
    startLng: trip.startLng,
    endName: trip.endName,
    endLat: trip.endLat,
    endLng: trip.endLng,
    distanceM: trip.distanceM,
    durationS: trip.durationS,
    tilesAdded: trip.tilesAdded,
    routeCoords: trip.routeCoords ?? [],
    drivenAt:
      trip.drivenAt instanceof Date
        ? trip.drivenAt.toISOString()
        : String(trip.drivenAt),
  }
}
