import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { claimedTiles, trips } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import type { MeResponse } from '@/lib/auth-types'
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
    const [tileRows, tripRows] = await Promise.all([
      db
        .select({ tileKey: claimedTiles.tileKey })
        .from(claimedTiles)
        .where(eq(claimedTiles.userId, user.id)),
      db
        .select()
        .from(trips)
        .where(eq(trips.userId, user.id))
        .orderBy(desc(trips.drivenAt))
        .limit(50),
    ])

    const payload: MeResponse = {
      user,
      claimedTiles: tileRows.map((r) => r.tileKey),
      trips: tripRows.map(tripToSummary),
    }
    return NextResponse.json(payload)
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[me]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Could not load account' }, { status: 500 })
  }
}
