/** Prefix for fine-grid tile keys (450 m cells). Legacy keys omit this. */
export const TILE_KEY_PREFIX = 'v2:'

export const NEW_TILE_KEY_RE = /^v2:\d+:\d+$/
export const LEGACY_TILE_KEY_RE = /^\d+:\d+$/

export function formatTileKey(tx: number, ty: number): string {
  return `${TILE_KEY_PREFIX}${tx}:${ty}`
}

export function parseTileKeyCoords(
  key: string,
): { tx: number; ty: number } | null {
  const raw = key.startsWith(TILE_KEY_PREFIX)
    ? key.slice(TILE_KEY_PREFIX.length)
    : key
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
  return isValidNewTileKey(key) || LEGACY_TILE_KEY_RE.test(key)
}
