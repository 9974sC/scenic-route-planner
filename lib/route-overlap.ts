import { haversine, tileKey, tilesForPath } from '@/lib/geo'

const PROXIMITY_M = 110

function sampleCoords(
  coords: [number, number][],
  maxSamples = 48,
): [number, number][] {
  if (coords.length <= maxSamples) return coords
  const out: [number, number][] = []
  const step = (coords.length - 1) / (maxSamples - 1)
  for (let i = 0; i < maxSamples; i++) {
    out.push(coords[Math.round(i * step)])
  }
  return out
}

/** Share of the return path that reuses outbound road (0 = clean loop, 1 = same road). */
export function pathOverlapRatio(
  outbound: [number, number][],
  inbound: [number, number][],
): number {
  if (outbound.length < 2 || inbound.length < 2) return 0

  const outboundTiles = tilesForPath(outbound)
  const inboundTiles = tilesForPath(inbound)

  // Endpoints naturally coincide on a loop — do not penalise those tiles.
  for (const coords of [outbound, inbound]) {
    const first = coords[0]
    const last = coords[coords.length - 1]
    outboundTiles.delete(tileKey(first[0], first[1]))
    outboundTiles.delete(tileKey(last[0], last[1]))
    inboundTiles.delete(tileKey(first[0], first[1]))
    inboundTiles.delete(tileKey(last[0], last[1]))
  }

  if (!inboundTiles.size) return 0

  let sharedTiles = 0
  for (const key of inboundTiles) {
    if (outboundTiles.has(key)) sharedTiles++
  }

  const tileOverlap = sharedTiles / inboundTiles.size

  const outboundSamples = sampleCoords(outbound)
  let closePoints = 0
  const inboundSamples = sampleCoords(inbound, 64)

  for (const [lat, lng] of inboundSamples) {
    const p = { lat, lng }
    const near = outboundSamples.some(
      ([oLat, oLng]) =>
        haversine(p, { lat: oLat, lng: oLng }) <= PROXIMITY_M,
    )
    if (near) closePoints++
  }

  const proximityOverlap = closePoints / inboundSamples.length
  return Math.max(tileOverlap, proximityOverlap * 0.85)
}

/** Which side of the chord the outbound path bulges (+1 / -1). */
export function outboundBulgeSide(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number },
  path: [number, number][],
): number {
  if (path.length < 3) return 1

  const dLat = end.lat - start.lat
  const dLng = end.lng - start.lng
  const perpLat = -dLng
  const perpLng = dLat
  const len = Math.hypot(perpLat, perpLng) || 1

  let sum = 0
  let n = 0
  const step = Math.max(1, Math.floor(path.length / 24))
  for (let i = step; i < path.length - step; i += step) {
    const t = i / (path.length - 1)
    const baseLat = start.lat + dLat * t
    const baseLng = start.lng + dLng * t
    const latOff = path[i][0] - baseLat
    const lngOff = path[i][1] - baseLng
    sum += (latOff * perpLat + lngOff * perpLng) / len
    n++
  }

  if (!n || Math.abs(sum) < 1e-7) return 1
  return sum > 0 ? 1 : -1
}

export function joinLoopCoords(
  outbound: [number, number][],
  inbound: [number, number][],
): [number, number][] {
  if (!inbound.length) return outbound
  if (!outbound.length) return inbound
  return [...outbound, ...inbound.slice(1)]
}
