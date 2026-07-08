export type LeaderboardEntry = {
  rank: number
  userId: string
  displayId: string
  username: string
  displayName: string | null
  hasAvatar: boolean
  avatarVersion: number
  colorHex: string
  tileCount: number
  coveragePct: number
  tripCount: number
  totalDistanceM: number
  /** Included for top map contributors only */
  tileKeys?: string[]
}

export type LeaderboardResponse = {
  entries: LeaderboardEntry[]
  gridTotal: number
}
