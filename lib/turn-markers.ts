import { bearing, haversine } from './geo'
import type { TurnMarker } from './types'

export type GraphHopperInstruction = {
  text: string
  sign: number
  interval?: [number, number]
}

const DEDUPE_METERS = 90

/** Higher = kept when two maneuvers are within DEDUPE_METERS. */
export function signImportance(sign: number): number {
  if (sign === 4) return 100
  if (sign === 6 || sign === -6) return 90
  if (sign === -8 || sign === 8 || sign === -98) return 85
  if (sign === -3 || sign === 3) return 75
  if (sign === -2 || sign === 2) return 65
  if (sign === 5) return 55
  if (sign === -7 || sign === 7) return 45
  if (sign === -1 || sign === 1) return 35
  if (sign === 0) return 15
  return 30
}

/** Map GraphHopper instructions to marker positions on the route polyline. */
export function buildTurnMarkersFromInstructions(
  instructions: GraphHopperInstruction[],
  /** GraphHopper points as [lng, lat, …] */
  routePoints: number[][],
): TurnMarker[] {
  const markers: TurnMarker[] = []

  for (const instruction of instructions) {
    const pointIndex = instruction.interval?.[0]
    if (pointIndex === undefined || pointIndex < 0) continue
    // Skip depart "continue" overlapping the start endpoint marker.
    if (pointIndex === 0 && instruction.sign === 0) continue
    const point = routePoints[pointIndex]
    if (!point || point.length < 2) continue

    markers.push({
      lat: point[1],
      lng: point[0],
      text: instruction.text,
      sign: instruction.sign,
      pointIndex,
      importance: signImportance(instruction.sign),
    })
  }

  return dedupeTurnMarkers(markers)
}

/** Drop or merge markers that sit within ~90 m of a more important maneuver. */
export function dedupeTurnMarkers(markers: TurnMarker[]): TurnMarker[] {
  if (markers.length <= 1) return markers

  const sorted = [...markers].sort((a, b) => a.pointIndex - b.pointIndex)
  const kept: TurnMarker[] = []

  for (const marker of sorted) {
    const nearbyIdx = kept.findIndex(
      (k) =>
        haversine(
          { lat: k.lat, lng: k.lng },
          { lat: marker.lat, lng: marker.lng },
        ) < DEDUPE_METERS,
    )
    if (nearbyIdx === -1) {
      kept.push(marker)
      continue
    }
    if (marker.importance > kept[nearbyIdx].importance) {
      kept[nearbyIdx] = marker
    }
  }

  return kept
}

/** Fewer markers when zoomed out to avoid clutter. */
export function filterTurnMarkersByZoom(
  markers: TurnMarker[],
  zoom: number,
): TurnMarker[] {
  if (zoom < 11) return markers.filter((m) => m.importance >= 85)
  if (zoom < 12) return markers.filter((m) => m.importance >= 65)
  if (zoom < 13) {
    return markers.filter((m) => m.importance >= 45 || m.sign === 4)
  }
  if (zoom < 14) return markers.filter((m) => m.sign !== 0)
  return markers
}

export function markerScaleForZoom(zoom: number): number {
  if (zoom < 11) return 0.7
  if (zoom < 13) return 0.85
  return 1
}

function bearingDelta(prev: number, next: number): number {
  let diff = next - prev
  while (diff > 180) diff -= 360
  while (diff < -180) diff += 360
  return diff
}

/** Bearing-change heuristic for simulated routes without GraphHopper instructions. */
export function inferTurnMarkersFromCoords(
  coords: [number, number][],
): TurnMarker[] {
  if (coords.length < 3) return []

  const markers: TurnMarker[] = []
  let prevBearing = bearing(
    { lat: coords[0][0], lng: coords[0][1] },
    { lat: coords[1][0], lng: coords[1][1] },
  )

  for (let i = 2; i < coords.length; i++) {
    const b = bearing(
      { lat: coords[i - 1][0], lng: coords[i - 1][1] },
      { lat: coords[i][0], lng: coords[i][1] },
    )
    const change = bearingDelta(prevBearing, b)
    const abs = Math.abs(change)

    if (abs >= 18) {
      let sign = 0
      if (change >= 50) sign = 3
      else if (change >= 18) sign = 1
      else if (change <= -50) sign = -3
      else if (change <= -18) sign = -1

      markers.push({
        lat: coords[i][0],
        lng: coords[i][1],
        text:
          sign > 0
            ? 'Turn right'
            : sign < 0
              ? 'Turn left'
              : 'Continue straight',
        sign,
        pointIndex: i,
        importance: signImportance(sign),
      })
    }

    prevBearing = b
  }

  const last = coords.length - 1
  markers.push({
    lat: coords[last][0],
    lng: coords[last][1],
    text: 'Arrive at destination',
    sign: 4,
    pointIndex: last,
    importance: signImportance(4),
  })

  return dedupeTurnMarkers(markers)
}
