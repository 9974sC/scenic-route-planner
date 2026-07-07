import { NextResponse } from 'next/server'
import { getClaimedTiles, getTrips, tripToSummary } from '@/lib/csv-store'
import { requireUser } from '@/lib/auth'
import type { MeResponse } from '@/lib/auth-types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const [claimedTiles, trips] = await Promise.all([
      getClaimedTiles(user.id),
      getTrips(user.id, 50),
    ])

    const payload: MeResponse = {
      user,
      claimedTiles,
      trips: trips.map(tripToSummary),
    }
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[me]', err)
    return NextResponse.json({ error: 'Could not load account' }, { status: 500 })
  }
}
