import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { claimedTiles, trips } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { dbErrorResponse } from '@/lib/db/errors'
import { tripToSummary } from '@/lib/trips'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const db = getDb()
    const tripRows = await db
      .select()
      .from(trips)
      .where(eq(trips.userId, user.id))
      .orderBy(desc(trips.drivenAt))
      .limit(50)

    return NextResponse.json({ trips: tripRows.map(tripToSummary) })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[trips GET]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to load trips' }, { status: 500 })
  }
}

type Body = {
  startName?: string
  startLat?: number
  startLng?: number
  endName?: string
  endLat?: number
  endLng?: number
  distanceM?: number
  durationS?: number
  tileKeys?: string[]
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = (await req.json()) as Body
    const {
      startName,
      startLat,
      startLng,
      endName,
      endLat,
      endLng,
      distanceM,
      durationS,
      tileKeys = [],
    } = body

    if (
      !startName ||
      !endName ||
      typeof startLat !== 'number' ||
      typeof startLng !== 'number' ||
      typeof endLat !== 'number' ||
      typeof endLng !== 'number' ||
      typeof distanceM !== 'number' ||
      typeof durationS !== 'number'
    ) {
      return NextResponse.json({ error: 'Invalid trip payload' }, { status: 400 })
    }

    const validTiles = tileKeys.filter(
      (k) => typeof k === 'string' && /^\d+:\d+$/.test(k),
    )

    const db = getDb()
    let tilesAdded: string[] = []

    if (validTiles.length > 0) {
      const inserted = await db
        .insert(claimedTiles)
        .values(
          validTiles.map((tileKey) => ({
            userId: user.id,
            tileKey,
          })),
        )
        .onConflictDoNothing()
        .returning({ tileKey: claimedTiles.tileKey })
      tilesAdded = inserted.map((r) => r.tileKey)
    }

    const [trip] = await db
      .insert(trips)
      .values({
        userId: user.id,
        startName,
        startLat,
        startLng,
        endName,
        endLat,
        endLng,
        distanceM: Math.round(distanceM),
        durationS: Math.round(durationS),
        tilesAdded,
      })
      .returning()

    return NextResponse.json({
      trip: tripToSummary(trip),
      tilesAdded: tilesAdded.length,
    })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[trips POST]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to save trip' }, { status: 500 })
  }
}
