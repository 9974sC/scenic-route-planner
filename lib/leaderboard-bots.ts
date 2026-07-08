import { formatTileKey, parseTileKeyCoords } from '@/lib/tile-keys'
import { tileKey } from '@/lib/geo'

export type LeaderboardBotDef = {
  username: string
  displayName: string
  bio: string
  location: string
  colorHex: string
  avatarInitials: string
  /** Center of claimed tile patch (Warsaw area). */
  patchCenter: { lat: number; lng: number }
  patchWidth: number
  patchHeight: number
}

export const LEADERBOARD_BOTS: LeaderboardBotDef[] = [
  {
    username: 'river_rider',
    displayName: 'Marta Kowalska',
    bio: 'Chasing sunrise rides along the Wisła.',
    location: 'Warsaw',
    colorHex: '#2563EB',
    avatarInitials: 'MK',
    patchCenter: { lat: 52.235, lng: 21.045 },
    patchWidth: 10,
    patchHeight: 8,
  },
  {
    username: 'park_pedaler',
    displayName: 'Olek Wiśniewski',
    bio: 'Łazienki loops and coffee stops.',
    location: 'Warsaw',
    colorHex: '#16A34A',
    avatarInitials: 'OW',
    patchCenter: { lat: 52.215, lng: 21.035 },
    patchWidth: 9,
    patchHeight: 11,
  },
  {
    username: 'bridge_biker',
    displayName: 'Zosia Nowak',
    bio: 'North-bank bridges, every weekend.',
    location: 'Warsaw',
    colorHex: '#EA580C',
    avatarInitials: 'ZN',
    patchCenter: { lat: 52.252, lng: 21.0 },
    patchWidth: 8,
    patchHeight: 10,
  },
  {
    username: 'mazovia_miles',
    displayName: 'Tomek Rutkowski',
    bio: 'East-side grids and long detours.',
    location: 'Warsaw',
    colorHex: '#7C3AED',
    avatarInitials: 'TR',
    patchCenter: { lat: 52.228, lng: 21.055 },
    patchWidth: 11,
    patchHeight: 7,
  },
]

/** Bot accounts share this password; they are not meant for interactive login. */
export const LEADERBOARD_BOT_PASSWORD = 'scenic-bot-seed-2026'

export function botAvatarData(initials: string, colorHex: string): {
  avatarMime: string
  avatarData: string
} {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
<rect width="128" height="128" rx="64" fill="${colorHex}"/>
<text x="64" y="68" text-anchor="middle" fill="#ffffff" font-family="system-ui,sans-serif" font-size="44" font-weight="600">${initials}</text>
</svg>`
  return {
    avatarMime: 'image/svg+xml',
    avatarData: Buffer.from(svg).toString('base64'),
  }
}

/** Rectangular patch of tile keys centered on a lat/lng point. */
export function tilePatchKeys(
  center: { lat: number; lng: number },
  width: number,
  height: number,
): string[] {
  const origin = parseTileKeyCoords(tileKey(center.lat, center.lng))
  if (!origin) return []

  const startX = origin.tx - Math.floor(width / 2)
  const startY = origin.ty - Math.floor(height / 2)
  const keys: string[] = []

  for (let dy = 0; dy < height; dy++) {
    for (let dx = 0; dx < width; dx++) {
      if (startX + dx < 0 || startY + dy < 0) continue
      keys.push(formatTileKey(startX + dx, startY + dy))
    }
  }

  return keys
}
