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
}
