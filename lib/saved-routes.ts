import type { DirectionStep } from '@/lib/directions'
import type { SavedRoute } from '@/lib/db/schema'
import type { ScenicWeights } from '@/lib/types'

export type SavedRouteSummary = {
  id: string
  label: string
  startName: string
  startLat: number
  startLng: number
  endName: string
  endLat: number
  endLng: number
  isRoundTrip: boolean
  distanceM: number
  durationS: number
  outboundCoords: [number, number][]
  returnCoords: [number, number][] | null
  directionSteps: DirectionStep[]
  returnDirectionSteps: DirectionStep[] | null
  weights: ScenicWeights
  savedAt: string
}

export function savedRouteToSummary(row: SavedRoute): SavedRouteSummary {
  const weights = row.weights as ScenicWeights
  return {
    id: row.id,
    label: row.label,
    startName: row.startName,
    startLat: row.startLat,
    startLng: row.startLng,
    endName: row.endName,
    endLat: row.endLat,
    endLng: row.endLng,
    isRoundTrip: row.isRoundTrip === 1,
    distanceM: row.distanceM,
    durationS: row.durationS,
    outboundCoords: (row.outboundCoords ?? []) as [number, number][],
    returnCoords: (row.returnCoords as [number, number][] | null) ?? null,
    directionSteps: (row.directionSteps ?? []) as DirectionStep[],
    returnDirectionSteps:
      (row.returnDirectionSteps as DirectionStep[] | null) ?? null,
    weights: {
      greenness: weights?.greenness ?? 0.45,
      curviness: weights?.curviness ?? 0.45,
      viewpoints: weights?.viewpoints ?? 0.45,
    },
    savedAt:
      row.savedAt instanceof Date
        ? row.savedAt.toISOString()
        : String(row.savedAt),
  }
}
