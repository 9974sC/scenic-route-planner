import { WARSAW_BBOX } from '@/lib/geo'
import { tileKey } from '@/lib/geo'
import { TILE_KEY_PREFIX } from '@/lib/tile-keys'

const LEGACY_TILE_SIZE_M = 900
const R = 6371000
const METERS_PER_DEG_LAT = (2 * Math.PI * R) / 360

function toRad(d: number) {
  return (d * Math.PI) / 180
}

function legacyTileLngStep(ty: number): number {
  const latStep = LEGACY_TILE_SIZE_M / METERS_PER_DEG_LAT
  const rowCenterLat = WARSAW_BBOX.south + (ty + 0.5) * latStep
  return LEGACY_TILE_SIZE_M / (METERS_PER_DEG_LAT * Math.cos(toRad(rowCenterLat)))
}

function legacyCellBounds(tx: number, ty: number) {
  const latStep = LEGACY_TILE_SIZE_M / METERS_PER_DEG_LAT
  const south = WARSAW_BBOX.south + ty * latStep
  const north = Math.min(south + latStep, WARSAW_BBOX.north)
  const lngStep = legacyTileLngStep(ty)
  const west = WARSAW_BBOX.west + tx * lngStep
  const east = Math.min(west + lngStep, WARSAW_BBOX.east)
  return { south, north, west, east }
}

/** Expand a pre-subdivision (900 m) tile key into fine-grid keys. */
export function expandLegacyTileKey(key: string): string[] {
  const parts = key.split(':')
  if (parts.length !== 2) return []
  const tx = Number(parts[0])
  const ty = Number(parts[1])
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return []

  const bounds = legacyCellBounds(tx, ty)
  const keys = new Set<string>()
  const steps = 3
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lat =
        bounds.south + ((bounds.north - bounds.south) * i) / steps
      const lng =
        bounds.west + ((bounds.east - bounds.west) * j) / steps
      keys.add(tileKey(lat, lng))
    }
  }
  return [...keys]
}

/** Map DB tile keys to the current fine grid (migrates legacy keys on read). */
export function normalizeStoredTileKeys(keys: string[]): string[] {
  const out = new Set<string>()
  for (const key of keys) {
    if (key.startsWith(TILE_KEY_PREFIX)) {
      out.add(key)
    } else if (/^\d+:\d+$/.test(key)) {
      for (const expanded of expandLegacyTileKey(key)) {
        out.add(expanded)
      }
    }
  }
  return [...out]
}
