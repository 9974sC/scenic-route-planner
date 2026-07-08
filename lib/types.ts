export type LatLng = { lat: number; lng: number }

export type Place = {
  id: string
  name: string
  hint: string
  point: LatLng
}

export type ScenicWeights = {
  greenness: number
  curviness: number
  viewpoints: number
}

export type ElevationStats = {
  /** lowest point along route, meters above sea level */
  min: number
  /** highest point along route, meters above sea level */
  max: number
  /** largest single climb from a valley to a peak, meters */
  biggestHill: number
}

export type TurnMarker = {
  lat: number
  lng: number
  text: string
  /** GraphHopper maneuver sign; see lib/turn-markers.ts */
  sign: number
  /** route point index for ordering / deduplication */
  pointIndex: number
  importance: number
}

export type RouteCandidate = {
  id: string
  /** ordered [lat, lng] path points */
  coords: [number, number][]
  /** meters */
  distance: number
  /** seconds */
  duration: number
  greenness: number // 0..1
  curviness: number // 0..1
  viewpoints: number // 0..1
  scenicScore: number // 0..1 weighted
  elevation: ElevationStats | null
  /** turn-by-turn markers along the route (GraphHopper or inferred) */
  turnMarkers?: TurnMarker[]
}

export type RouteResponse = {
  source: 'graphhopper' | 'simulated'
  candidates: RouteCandidate[]
  /** index of the fastest/most-direct candidate */
  directIndex: number
  /** Set when live routing failed and simulated paths were returned instead */
  routingWarning?: string
}
