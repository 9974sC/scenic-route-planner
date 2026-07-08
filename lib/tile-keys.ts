/** Prefix for 100 m Mazowieckie grid. v3 = 10 m; v2 = 450 m Warsaw; bare = 900 m legacy. */
export const TILE_KEY_PREFIX = 'v4:'

export const NEW_TILE_KEY_RE = /^v4:\d+:\d+$/
export const V3_TILE_KEY_RE = /^v3:\d+:\d+$/
export const V2_TILE_KEY_RE = /^v2:\d+:\d+$/
export const LEGACY_TILE_KEY_RE = /^\d+:\d+$/

export function formatTileKey(tx: number, ty: number): string {
  return `${TILE_KEY_PREFIX}${tx}:${ty}`
}

export function parseTileKeyCoords(
  key: string,
): { tx: number; ty: number } | null {
  if (!key.startsWith(TILE_KEY_PREFIX)) return null
  const raw = key.slice(TILE_KEY_PREFIX.length)
  const parts = raw.split(':')
  if (parts.length !== 2) return null
  const tx = Number(parts[0])
  const ty = Number(parts[1])
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return null
  return { tx, ty }
}

export function isValidNewTileKey(key: string): boolean {
  return NEW_TILE_KEY_RE.test(key)
}

export function isValidStoredTileKey(key: string): boolean {
  return (
    isValidNewTileKey(key) ||
    V3_TILE_KEY_RE.test(key) ||
    V2_TILE_KEY_RE.test(key) ||
    LEGACY_TILE_KEY_RE.test(key)
  )
}
