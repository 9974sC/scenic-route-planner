import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { claimedTiles } from '@/lib/db/schema'
import { requireUser } from '@/lib/auth'
import { dbErrorResponse } from '@/lib/db/errors'
import { isValidNewTileKey } from '@/lib/tile-keys'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const db = getDb()
    const rows = await db
      .select({ tileKey: claimedTiles.tileKey })
      .from(claimedTiles)
      .where(eq(claimedTiles.userId, user.id))

    return NextResponse.json({ tiles: rows.map((r) => r.tileKey) })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[coverage GET]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to load coverage' }, { status: 500 })
  }
}

type Body = { tileKeys?: string[] }

export async function POST(req: Request) {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const body = (await req.json()) as Body
    const tileKeys = body.tileKeys
    if (!Array.isArray(tileKeys) || !tileKeys.length) {
      return NextResponse.json({ error: 'tileKeys required' }, { status: 400 })
    }

    const valid = tileKeys.filter(
      (k) => typeof k === 'string' && isValidNewTileKey(k),
    )
    if (!valid.length) {
      return NextResponse.json({ error: 'No valid tile keys' }, { status: 400 })
    }

    const db = getDb()
    const inserted = await db
      .insert(claimedTiles)
      .values(
        valid.map((tileKey) => ({
          userId: user.id,
          tileKey,
        })),
      )
      .onConflictDoNothing()
      .returning({ tileKey: claimedTiles.tileKey })

    return NextResponse.json({
      added: inserted.length,
      tiles: inserted.map((r) => r.tileKey),
    })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[coverage POST]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to save coverage' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const db = getDb()
    await db.delete(claimedTiles).where(eq(claimedTiles.userId, user.id))
    return NextResponse.json({ ok: true })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[coverage DELETE]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Failed to reset coverage' }, { status: 500 })
  }
}
