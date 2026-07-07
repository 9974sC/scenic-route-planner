export type SessionData = {
  userId?: string
}

export type PublicUser = {
  id: string
  publicCode: string
  displayId: string
  email: string
  colorHex: string
}

export type TripSummary = {
  id: string
  startName: string
  endName: string
  distanceM: number
  durationS: number
  tilesAdded: string[]
  drivenAt: string
}

export type MeResponse = {
  user: PublicUser
  claimedTiles: string[]
  trips: TripSummary[]
}
