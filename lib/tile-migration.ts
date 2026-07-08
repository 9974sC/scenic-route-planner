import { MAZOWIECKIE_BBOX, tileKey } from '@/lib/geo'
import { TILE_KEY_PREFIX } from '@/lib/tile-keys'

const V3_TILE_SIZE_M = 10

/** Warsaw-only grid used before Mazowieckie expansion (900 m cells). */
const LEGACY_WARSAW_BBOX = {
  south: 52.09,
  north: 52.37,
  west: 20.82,
  east: 21.27,
} as const

const LEGACY_TILE_SIZE_M = 900

/** Warsaw 450 m grid (v2 keys) before 10 m Mazowieckie grid. */
const V2_WARSAW_BBOX = LEGACY_WARSAW_BBOX
const V2_TILE_SIZE_M = 450

const R = 6371000
const METERS_PER_DEG_LAT = (2 * Math.PI * R) / 360

function toRad(d: number) {
  return (d * Math.PI) / 180
}

function tileLngStepFor(
  ty: number,
  bbox: { south: number; north: number },
  tileSizeM: number,
): number {
  const latStep = tileSizeM / METERS_PER_DEG_LAT
  const rowCenterLat = bbox.south + (ty + 0.5) * latStep
  return tileSizeM / (METERS_PER_DEG_LAT * Math.cos(toRad(rowCenterLat)))
}

function cellBoundsFor(
  tx: number,
  ty: number,
  bbox: { south: number; north: number; west: number; east: number },
  tileSizeM: number,
) {
  const latStep = tileSizeM / METERS_PER_DEG_LAT
  const south = bbox.south + ty * latStep
  const north = Math.min(south + latStep, bbox.north)
  const lngStep = tileLngStepFor(ty, bbox, tileSizeM)
  const west = bbox.west + tx * lngStep
  const east = Math.min(west + lngStep, bbox.east)
  return { south, north, west, east }
}

function sampleKeysInBounds(bounds: {
  south: number
  north: number
  west: number
  east: number
}): string[] {
  const keys = new Set<string>()
  const steps = 8
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lat = bounds.south + ((bounds.north - bounds.south) * i) / steps
      const lng = bounds.west + ((bounds.east - bounds.west) * j) / steps
      keys.add(tileKey(lat, lng))
    }
  }
  return [...keys]
}

/** Expand a pre-subdivision (900 m, Warsaw) tile key into current grid keys. */
export function expandLegacyTileKey(key: string): string[] {
  const parts = key.split(':')
  if (parts.length !== 2) return []
  const tx = Number(parts[0])
  const ty = Number(parts[1])
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return []

  const bounds = cellBoundsFor(tx, ty, LEGACY_WARSAW_BBOX, LEGACY_TILE_SIZE_M)
  return sampleKeysInBounds(bounds)
}

/** Map a v3 (10 m) tile key to the parent 100 m cell. */
export function collapseV3TileKey(key: string): string | null {
  const raw = key.startsWith('v3:') ? key.slice(3) : key
  const parts = raw.split(':')
  if (parts.length !== 2) return null
  const tx = Number(parts[0])
  const ty = Number(parts[1])
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null

  const bounds = cellBoundsFor(tx, ty, MAZOWIECKIE_BBOX, V3_TILE_SIZE_M)
  const lat = (bounds.south + bounds.north) / 2
  const lng = (bounds.west + bounds.east) / 2
  return tileKey(lat, lng)
}

/** Expand a v2 (450 m, Warsaw) tile key into current Mazowieckie keys. */
export function expandV2TileKey(key: string): string[] {
  const raw = key.startsWith('v2:') ? key.slice(3) : key
  const parts = raw.split(':')
  if (parts.length !== 2) return []
  const tx = Number(parts[0])
  const ty = Number(parts[1])
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return []

  const bounds = cellBoundsFor(tx, ty, V2_WARSAW_BBOX, V2_TILE_SIZE_M)
  return sampleKeysInBounds(bounds)
}

/** Map DB tile keys to the current fine grid (migrates legacy keys on read). */
export function normalizeStoredTileKeys(keys: string[]): string[] {
  const out = new Set<string>()
  for (const key of keys) {
    const k = key.trim()
    if (!k) continue
    if (k.startsWith(TILE_KEY_PREFIX)) {
      out.add(k)
    } else if (k.startsWith('v3:')) {
      const collapsed = collapseV3TileKey(k)
      if (collapsed) out.add(collapsed)
    } else if (k.startsWith('v2:')) {
      for (const expanded of expandV2TileKey(k)) {
        out.add(expanded)
      }
    } else if (/^\d+:\d+$/.test(k)) {
      for (const expanded of expandLegacyTileKey(k)) {
        out.add(expanded)
      }
    }
  }
  return [...out]
}
