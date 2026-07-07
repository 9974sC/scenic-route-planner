import { NextResponse } from 'next/server'
import { claimTiles, clearClaimedTiles, getClaimedTiles } from '@/lib/csv-store'
import { requireUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }
    const tiles = await getClaimedTiles(user.id)
    return NextResponse.json({ tiles })
  } catch (err) {
    console.error('[coverage GET]', err)
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
      (k) => typeof k === 'string' && /^\d+:\d+$/.test(k),
    )
    if (!valid.length) {
      return NextResponse.json({ error: 'No valid tile keys' }, { status: 400 })
    }

    const added = await claimTiles(user.id, valid)
    return NextResponse.json({ added: added.length, tiles: added })
  } catch (err) {
    console.error('[coverage POST]', err)
    return NextResponse.json({ error: 'Failed to save coverage' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }
    await clearClaimedTiles(user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[coverage DELETE]', err)
    return NextResponse.json({ error: 'Failed to reset coverage' }, { status: 500 })
  }
}
