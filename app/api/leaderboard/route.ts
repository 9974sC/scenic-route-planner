import { NextResponse } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { claimedTiles, trips, users } from '@/lib/db/schema'
import { dbErrorResponse } from '@/lib/db/errors'
import type { LeaderboardEntry, LeaderboardResponse } from '@/lib/leaderboard-types'
import { totalTiles } from '@/lib/geo'
import { normalizeStoredTileKeys } from '@/lib/tile-migration'
import { displayUserId } from '@/lib/user-code'

export const dynamic = 'force-dynamic'

const MAP_TILE_USER_LIMIT = 15

export async function GET() {
  try {
    const db = getDb()
    const gridTotal = totalTiles()

    const tileRows = await db
      .select({
        userId: claimedTiles.userId,
        tileKey: claimedTiles.tileKey,
        publicCode: users.publicCode,
        username: users.username,
        displayName: users.displayName,
        avatarMime: users.avatarMime,
        avatarData: users.avatarData,
        colorHex: users.colorHex,
      })
      .from(claimedTiles)
      .innerJoin(users, eq(claimedTiles.userId, users.id))

    const tripStats = await db
      .select({
        userId: trips.userId,
        tripCount: sql<number>`count(*)::int`,
        totalDistanceM: sql<number>`coalesce(sum(${trips.distanceM}), 0)::int`,
      })
      .from(trips)
      .groupBy(trips.userId)

    const tripByUser = new Map(
      tripStats.map((r) => [
        r.userId,
        { tripCount: r.tripCount, totalDistanceM: r.totalDistanceM },
      ]),
    )

    const byUser = new Map<
      string,
      {
        publicCode: string
        username: string
        displayName: string | null
        avatarMime: string | null
        avatarData: string | null
        colorHex: string
        tileKeys: string[]
      }
    >()

    for (const row of tileRows) {
      let bucket = byUser.get(row.userId)
      if (!bucket) {
        bucket = {
          publicCode: row.publicCode,
          username: row.username,
          displayName: row.displayName,
          avatarMime: row.avatarMime,
          avatarData: row.avatarData,
          colorHex: row.colorHex,
          tileKeys: [],
        }
        byUser.set(row.userId, bucket)
      }
      bucket.tileKeys.push(row.tileKey)
    }

    const ranked = [...byUser.entries()].map(([userId, data]) => ({
      userId,
      data,
      normalizedTileKeys: normalizeStoredTileKeys(data.tileKeys),
    }))

    ranked.sort((a, b) => b.normalizedTileKeys.length - a.normalizedTileKeys.length)

    const entries: LeaderboardEntry[] = ranked.map(({ userId, data, normalizedTileKeys }, i) => {
      const stats = tripByUser.get(userId)
      const tileCount = normalizedTileKeys.length
      const entry: LeaderboardEntry = {
        rank: i + 1,
        userId,
        displayId: displayUserId(data.publicCode),
        username: data.username,
        displayName: data.displayName,
        hasAvatar: Boolean(data.avatarMime && data.avatarData),
        avatarVersion: data.avatarData?.length ?? 0,
        colorHex: data.colorHex,
        tileCount,
        coveragePct: gridTotal ? (tileCount / gridTotal) * 100 : 0,
        tripCount: stats?.tripCount ?? 0,
        totalDistanceM: stats?.totalDistanceM ?? 0,
      }
      if (i < MAP_TILE_USER_LIMIT) {
        entry.tileKeys = normalizedTileKeys
      }
      return entry
    })

    const payload: LeaderboardResponse = { entries, gridTotal }
    return NextResponse.json(payload)
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[leaderboard GET]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
