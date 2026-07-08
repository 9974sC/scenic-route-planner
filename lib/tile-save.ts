import { tilesForPath } from '@/lib/geo'
import { isValidNewTileKey } from '@/lib/tile-keys'
import { normalizeStoredTileKeys } from '@/lib/tile-migration'

/** Normalize any stored/client tile key to the current grid for persistence. */
export function tileKeysForSave(raw: string[]): string[] {
  const trimmed = raw
    .filter((k): k is string => typeof k === 'string')
    .map((k) => k.trim())
    .filter(Boolean)
  return [...new Set(normalizeStoredTileKeys(trimmed).filter(isValidNewTileKey))]
}

/** Prefer client keys; derive from route geometry when keys are missing or stale. */
export function resolveTileKeysForSave(
  rawKeys: string[],
  routeCoords: [number, number][],
): string[] {
  const fromClient = tileKeysForSave(rawKeys)
  if (fromClient.length > 0) return fromClient
  if (routeCoords.length < 2) return []
  return tileKeysForSave([...tilesForPath(routeCoords)])
}
