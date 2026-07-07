import { NextResponse } from 'next/server'
import { addTrip, claimTiles, getTrips, tripToSummary } from '@/lib/csv-store'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }
    const trips = await getTrips(user.id, 50)
    return NextResponse.json({ trips: trips.map(tripToSummary) })
  } catch (err) {
    console.error('[trips GET]', err)
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

    const tilesAdded =
      validTiles.length > 0 ? await claimTiles(user.id, validTiles) : []

    const trip = await addTrip(user.id, {
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

    return NextResponse.json({
      trip: tripToSummary(trip),
      tilesAdded: tilesAdded.length,
    })
  } catch (err) {
    console.error('[trips POST]', err)
    return NextResponse.json({ error: 'Failed to save trip' }, { status: 500 })
  }
}
