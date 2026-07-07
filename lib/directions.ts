import { bearing, haversine, pathLength } from './geo'
import type { LatLng, TurnMarker } from './types'

export type DirectionStep = {
  id: string
  text: string
  sign: number
  /** Meters from the previous step along the route. */
  distanceM: number
  pointIndex: number
  lat: number
  lng: number
}

export function formatDistanceM(meters: number): string {
  const m = Math.max(0, Math.round(meters))
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`
  return `${m} m`
}

function segmentLength(
  coords: [number, number][],
  fromIndex: number,
  toIndex: number,
): number {
  if (toIndex <= fromIndex) return 0
  return pathLength(coords.slice(fromIndex, toIndex + 1))
}

/** Turn markers → ordered steps with leg distances in meters. */
export function buildDirectionSteps(
  coords: [number, number][],
  markers: TurnMarker[],
): DirectionStep[] {
  if (!coords.length) return []

  const sorted = [...markers].sort((a, b) => a.pointIndex - b.pointIndex)
  if (!sorted.length) {
    const last = coords[coords.length - 1]
    return [
      {
        id: 'direct',
        text: 'Follow the route to your destination',
        sign: 0,
        distanceM: Math.round(pathLength(coords)),
        pointIndex: coords.length - 1,
        lat: last[0],
        lng: last[1],
      },
    ]
  }

  const steps: DirectionStep[] = []
  let prevIndex = 0

  for (let i = 0; i < sorted.length; i++) {
    const marker = sorted[i]
    steps.push({
      id: `step-${marker.pointIndex}-${marker.sign}-${i}`,
      text: marker.text,
      sign: marker.sign,
      distanceM: Math.round(segmentLength(coords, prevIndex, marker.pointIndex)),
      pointIndex: marker.pointIndex,
      lat: marker.lat,
      lng: marker.lng,
    })
    prevIndex = marker.pointIndex
  }

  return steps
}

/** Nearest point on the polyline → index along coords. */
export function nearestCoordIndex(coords: [number, number][], point: LatLng): number {
  if (!coords.length) return 0
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < coords.length; i++) {
    const d = haversine(point, { lat: coords[i][0], lng: coords[i][1] })
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}

/** Active step = first step whose maneuver is still ahead on the route. */
export function findActiveStepIndex(
  coords: [number, number][],
  steps: DirectionStep[],
  position: LatLng | null,
): number {
  if (!steps.length) return 0
  if (!position || !coords.length) return 0

  const along = nearestCoordIndex(coords, position)
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].pointIndex >= along) return i
  }
  return steps.length - 1
}

/** Distance in meters from position to the next step maneuver. */
export function distanceToStep(
  coords: [number, number][],
  step: DirectionStep,
  position: LatLng,
): number {
  const from = nearestCoordIndex(coords, position)
  return Math.round(segmentLength(coords, from, step.pointIndex))
}

/** Bearing (degrees, clockwise from north) along the route at a polyline index. */
export function travelBearingAtIndex(
  coords: [number, number][],
  index: number,
): number {
  if (coords.length < 2) return 0
  const i = Math.min(Math.max(index, 0), coords.length - 2)
  return bearing(
    { lat: coords[i][0], lng: coords[i][1] },
    { lat: coords[i + 1][0], lng: coords[i + 1][1] },
  )
}

/** Bearing along the route at the nearest point to `position`. */
export function travelBearingAtPosition(
  coords: [number, number][],
  position: LatLng,
): number {
  return travelBearingAtIndex(coords, nearestCoordIndex(coords, position))
}
