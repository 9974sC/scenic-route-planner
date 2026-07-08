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
        colorHex: string
        tileKeys: string[]
      }
    >()

    for (const row of tileRows) {
      let bucket = byUser.get(row.userId)
      if (!bucket) {
        bucket = {
          publicCode: row.publicCode,
          colorHex: row.colorHex,
          tileKeys: [],
        }
        byUser.set(row.userId, bucket)
      }
      bucket.tileKeys.push(row.tileKey)
    }

    const sorted = [...byUser.entries()].sort(
      (a, b) => b[1].tileKeys.length - a[1].tileKeys.length,
    )

    const entries: LeaderboardEntry[] = sorted.map(([userId, data], i) => {
      const stats = tripByUser.get(userId)
      const tileCount = data.tileKeys.length
      const entry: LeaderboardEntry = {
        rank: i + 1,
        userId,
        displayId: displayUserId(data.publicCode),
        colorHex: data.colorHex,
        tileCount,
        coveragePct: gridTotal ? (tileCount / gridTotal) * 100 : 0,
        tripCount: stats?.tripCount ?? 0,
        totalDistanceM: stats?.totalDistanceM ?? 0,
      }
      if (i < MAP_TILE_USER_LIMIT) {
        entry.tileKeys = normalizeStoredTileKeys(data.tileKeys)
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
