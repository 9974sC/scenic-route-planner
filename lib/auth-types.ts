export type SessionData = {
  userId?: string
}

export type PublicUser = {
  id: string
  publicCode: string
  displayId: string
  username: string
  displayName: string | null
  bio: string | null
  location: string | null
  colorHex: string
  hasAvatar: boolean
  avatarVersion: number
  /** ISO timestamp when color can be changed again; null if allowed now. */
  colorChangeAvailableAt: string | null
  /** ISO timestamp when the account was created. */
  createdAt: string
}

export type TripSummary = {
  id: string
  startName: string
  startLat: number
  startLng: number
  endName: string
  endLat: number
  endLng: number
  distanceM: number
  durationS: number
  tilesAdded: string[]
  routeCoords: [number, number][]
  drivenAt: string
}

export type MeResponse = {
  user: PublicUser
  claimedTiles: string[]
  trips: TripSummary[]
  savedRoutes: import('@/lib/saved-routes').SavedRouteSummary[]
}

export type RegisterInput = {
  username: string
  password: string
  colorHex: string
  displayName?: string
  bio?: string
  location?: string
}

export type LoginInput = {
  username: string
  password: string
}

export type ProfileUpdateInput = {
  displayName?: string
  bio?: string
  location?: string
}
