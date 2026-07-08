import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { savedRoutes } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { dbErrorResponse } from '@/lib/db/errors'
import { savedRouteToSummary } from '@/lib/saved-routes'
import type { DirectionStep } from '@/lib/directions'
import type { ScenicWeights } from '@/lib/types'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const db = getDb()
    const rows = await db
      .select()
      .from(savedRoutes)
      .where(eq(savedRoutes.userId, user.id))
      .orderBy(desc(savedRoutes.savedAt))
      .limit(50)

    return NextResponse.json({
      savedRoutes: rows.map(savedRouteToSummary),
    })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[saved-routes GET]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to load saved routes' }, { status: 500 })
  }
}

type Body = {
  label?: string
  startName?: string
  startLat?: number
  startLng?: number
  endName?: string
  endLat?: number
  endLng?: number
  isRoundTrip?: boolean
  distanceM?: number
  durationS?: number
  outboundCoords?: unknown
  returnCoords?: unknown
  directionSteps?: unknown
  returnDirectionSteps?: unknown
  weights?: ScenicWeights
}

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = (await req.json()) as Body
    const {
      label,
      startName,
      startLat,
      startLng,
      endName,
      endLat,
      endLng,
      isRoundTrip = false,
      distanceM,
      durationS,
      outboundCoords,
      returnCoords,
      directionSteps,
      returnDirectionSteps,
      weights,
    } = body

    if (
      !startName ||
      !endName ||
      typeof startLat !== 'number' ||
      typeof startLng !== 'number' ||
      typeof endLat !== 'number' ||
      typeof endLng !== 'number' ||
      typeof distanceM !== 'number' ||
      typeof durationS !== 'number' ||
      !Array.isArray(outboundCoords) ||
      !Array.isArray(directionSteps)
    ) {
      return NextResponse.json({ error: 'Invalid saved route payload' }, { status: 400 })
    }

    if (outboundCoords.length > 20_000) {
      return NextResponse.json({ error: 'Route too long to store' }, { status: 400 })
    }

    const db = getDb()
    const [row] = await db
      .insert(savedRoutes)
      .values({
        userId: user.id,
        label: (label?.trim() || `${startName} → ${endName}`).slice(0, 120),
        startName,
        startLat,
        startLng,
        endName,
        endLat,
        endLng,
        isRoundTrip: isRoundTrip ? 1 : 0,
        distanceM: Math.round(distanceM),
        durationS: Math.round(durationS),
        outboundCoords: outboundCoords as [number, number][],
        returnCoords: Array.isArray(returnCoords)
          ? (returnCoords as [number, number][])
          : null,
        directionSteps: directionSteps as DirectionStep[],
        returnDirectionSteps: Array.isArray(returnDirectionSteps)
          ? (returnDirectionSteps as DirectionStep[])
          : null,
        weights: weights ?? {},
      })
      .returning()

    return NextResponse.json({ savedRoute: savedRouteToSummary(row) })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[saved-routes POST]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to save route' }, { status: 500 })
  }
}
