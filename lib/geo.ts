import type { ElevationStats, LatLng } from './types'
import { formatTileKey, parseTileKeyCoords } from './tile-keys'

export { formatTileKey, parseTileKeyCoords, TILE_KEY_PREFIX } from './tile-keys'
export { isValidNewTileKey, isValidStoredTileKey } from './tile-keys'

export const WARSAW_CENTER: LatLng = { lat: 52.2297, lng: 21.0122 }

/** Mazowieckie voivodeship — coverage playing field (approx. admin bounds). */
export const MAZOWIECKIE_BBOX = {
  south: 51.05,
  north: 53.45,
  west: 19.3,
  east: 23.1,
} as const

/** @deprecated Use MAZOWIECKIE_BBOX */
export const WARSAW_BBOX = MAZOWIECKIE_BBOX

export const COVERAGE_BBOX = MAZOWIECKIE_BBOX

/** Fixed geographic origin for the coverage grid (south-west corner). */
export const COVERAGE_GRID_ORIGIN: LatLng = {
  lat: COVERAGE_BBOX.south,
  lng: COVERAGE_BBOX.west,
}

/** Ground size of each coverage cell — square on the map (meters). */
export const TILE_SIZE_M = 100

const R = 6371000 // earth radius meters
const METERS_PER_DEG_LAT = (2 * Math.PI * R) / 360

function regionGroundExtents() {
  const centerLat = (COVERAGE_BBOX.north + COVERAGE_BBOX.south) / 2
  const heightM =
    (COVERAGE_BBOX.north - COVERAGE_BBOX.south) * METERS_PER_DEG_LAT
  const widthM =
    (COVERAGE_BBOX.east - COVERAGE_BBOX.west) *
    METERS_PER_DEG_LAT *
    Math.cos(toRad(centerLat))
  return { heightM, widthM, centerLat }
}

/** Row count to cover the full playing-field height. */
export function gridRowCount(): number {
  const { heightM } = regionGroundExtents()
  return Math.max(1, Math.ceil(heightM / TILE_SIZE_M))
}

/** Column count for a row (square ground cells; lng span varies by latitude). */
export function gridColCount(ty: number): number {
  const lngStep = tileLngStep(ty)
  const widthDeg = COVERAGE_BBOX.east - COVERAGE_BBOX.west
  return Math.max(1, Math.ceil(widthDeg / lngStep))
}

function maxGridColCount(): number {
  const rows = gridRowCount()
  let max = 0
  for (let ty = 0; ty < rows; ty++) {
    max = Math.max(max, gridColCount(ty))
  }
  return max
}

/** Largest grid axis extent (used where a single scalar is enough). */
export function gridDimension(): number {
  return Math.max(gridRowCount(), maxGridColCount())
}

export function tileLatStep(): number {
  return TILE_SIZE_M / METERS_PER_DEG_LAT
}

export function rowCenterLat(ty: number): number {
  return COVERAGE_BBOX.south + (ty + 0.5) * tileLatStep()
}

/** Longitude span for a square cell at grid row ty. */
export function tileLngStep(ty: number): number {
  return TILE_SIZE_M / (METERS_PER_DEG_LAT * Math.cos(toRad(rowCenterLat(ty))))
}

/** @deprecated Use tileLatStep() — kept for any legacy imports */
export const TILE_SIZE = tileLatStep()

export function haversine(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function toRad(d: number) {
  return (d * Math.PI) / 180
}

export function bearing(a: LatLng, b: LatLng): number {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat))
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng))
  return (Math.atan2(y, x) * 180) / Math.PI
}

/** min/max elevation and largest single climb from a valley to a peak */
export function elevationStats(elevations: number[]): ElevationStats {
  if (!elevations.length) {
    throw new Error('elevationStats requires at least one sample')
  }

  let min = elevations[0]
  let max = elevations[0]
  let biggestHill = 0
  let trough = elevations[0]

  for (const e of elevations) {
    if (e < min) min = e
    if (e > max) max = e
    if (e < trough) trough = e
    biggestHill = Math.max(biggestHill, e - trough)
  }

  return {
    min: Math.round(min),
    max: Math.round(max),
    biggestHill: Math.round(biggestHill),
  }
}

/** plausible Warsaw-area elevation profile when no live data is available */
export function simulatedElevations(
  coords: [number, number][],
  seed: string,
): number[] {
  const base = 95 + hash01(seed) * 25
  const phase = hash01(`${seed}:phase`) * Math.PI * 2
  const last = Math.max(coords.length - 1, 1)

  return coords.map(([lat, lng], i) => {
    const t = i / last
    const wave =
      Math.sin(t * Math.PI * 1.8 + phase) * 12 +
      Math.sin(t * Math.PI * 4.2 + phase * 0.7) * 5
    const distCenter = haversine({ lat, lng }, WARSAW_CENTER)
    const away = clamp01(distCenter / 15000) * 8
    return Math.round((base + wave + away) * 10) / 10
  })
}

/** total path length in meters */
export function pathLength(coords: [number, number][]): number {
  let d = 0
  for (let i = 1; i < coords.length; i++) {
    d += haversine(
      { lat: coords[i - 1][0], lng: coords[i - 1][1] },
      { lat: coords[i][0], lng: coords[i][1] },
    )
  }
  return d
}

/**
 * Curviness 0..1: accumulated absolute heading change per km, squashed.
 * Straight highways ~ 0, twisty forest roads ~ 1.
 */
export function curvinessScore(coords: [number, number][]): number {
  if (coords.length < 3) return 0
  let turn = 0
  let prev = bearing(
    { lat: coords[0][0], lng: coords[0][1] },
    { lat: coords[1][0], lng: coords[1][1] },
  )
  for (let i = 2; i < coords.length; i++) {
    const b = bearing(
      { lat: coords[i - 1][0], lng: coords[i - 1][1] },
      { lat: coords[i][0], lng: coords[i][1] },
    )
    let diff = Math.abs(b - prev)
    if (diff > 180) diff = 360 - diff
    turn += diff
    prev = b
  }
  const km = Math.max(pathLength(coords) / 1000, 0.1)
  const perKm = turn / km // degrees of turning per km
  return clamp01(perKm / 140)
}

/**
 * Greenness proxy (prototype): roads farther from the dense center and
 * closer to Warsaw's forest belts (Kabaty S, Kampinos NW, Bielany N) score
 * higher. A real build swaps this for OSM landuse=forest/park coverage.
 */
export function greennessScore(coords: [number, number][]): number {
  const forests: LatLng[] = [
    { lat: 52.13, lng: 21.07 }, // Kabaty
    { lat: 52.33, lng: 20.85 }, // Kampinos edge
    { lat: 52.29, lng: 20.94 }, // Bielany
    { lat: 52.16, lng: 21.09 }, // Wilanów green
  ]
  let sum = 0
  const step = Math.max(1, Math.floor(coords.length / 40))
  let n = 0
  for (let i = 0; i < coords.length; i += step) {
    const p = { lat: coords[i][0], lng: coords[i][1] }
    const distCenter = haversine(p, WARSAW_CENTER)
    const nearestForest = Math.min(
      ...forests.map((f) => haversine(p, f)),
    )
    // farther from center = greener, near a forest = greener
    const centerTerm = clamp01((distCenter - 3000) / 12000)
    const forestTerm = clamp01(1 - nearestForest / 6000)
    sum += 0.45 * centerTerm + 0.55 * forestTerm
    n++
  }
  return clamp01(n ? sum / n : 0)
}

/**
 * Viewpoints proxy (prototype): reward routes hugging the Vistula river line
 * and named panorama spots. Real build swaps for OSM tourism=viewpoint POIs.
 */
export function viewpointsScore(coords: [number, number][]): number {
  const spots: LatLng[] = [
    { lat: 52.24, lng: 21.03 }, // Vistula boulevards
    { lat: 52.25, lng: 21.02 }, // Old Town escarpment
    { lat: 52.215, lng: 21.036 }, // Łazienki
    { lat: 52.165, lng: 21.09 }, // Wilanów
  ]
  let best = 0
  const step = Math.max(1, Math.floor(coords.length / 40))
  for (let i = 0; i < coords.length; i += step) {
    const p = { lat: coords[i][0], lng: coords[i][1] }
    const nearest = Math.min(...spots.map((s) => haversine(p, s)))
    best = Math.max(best, clamp01(1 - nearest / 2500))
  }
  return best
}

export function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** deterministic 0..1 hash from a string (for stable simulated variety) */
export function hash01(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 100000) / 100000
}

/** key for the square coverage tile that contains a point */
export function tileKey(lat: number, lng: number): string {
  const latStep = tileLatStep()
  let ty = Math.floor((lat - COVERAGE_BBOX.south) / latStep)
  ty = Math.max(0, Math.min(gridRowCount() - 1, ty))

  const lngStep = tileLngStep(ty)
  let tx = Math.floor((lng - COVERAGE_BBOX.west) / lngStep)
  tx = Math.max(0, Math.min(gridColCount(ty) - 1, tx))

  return formatTileKey(tx, ty)
}

/** all tile keys a path passes through (sampled every ~half a cell) */
export function tilesForPath(coords: [number, number][]): Set<string> {
  const keys = new Set<string>()
  const sampleM = TILE_SIZE_M / 2
  for (let i = 1; i < coords.length; i++) {
    const [aLat, aLng] = coords[i - 1]
    const [bLat, bLng] = coords[i]
    const segs = Math.max(
      1,
      Math.ceil(
        haversine({ lat: aLat, lng: aLng }, { lat: bLat, lng: bLng }) / sampleM,
      ),
    )
    for (let s = 0; s <= segs; s++) {
      const t = s / segs
      keys.add(tileKey(aLat + (bLat - aLat) * t, aLng + (bLng - aLng) * t))
    }
  }
  return keys
}

/** bounds (SW/NE latlng) for a tile key */
export function tileBounds(key: string): [[number, number], [number, number]] {
  const parsed = parseTileKeyCoords(key)
  if (!parsed) {
    throw new Error(`Invalid tile key: ${key}`)
  }
  const latStep = tileLatStep()
  const south = COVERAGE_BBOX.south + parsed.ty * latStep
  const north = Math.min(south + latStep, COVERAGE_BBOX.north)
  const lngStep = tileLngStep(parsed.ty)
  const west = COVERAGE_BBOX.west + parsed.tx * lngStep
  const east = Math.min(west + lngStep, COVERAGE_BBOX.east)
  return [
    [south, west],
    [north, east],
  ]
}

/** total tiles across the full rectangular playing field */
export function totalTiles(): number {
  const rows = gridRowCount()
  let total = 0
  for (let ty = 0; ty < rows; ty++) {
    total += gridColCount(ty)
  }
  return total
}
