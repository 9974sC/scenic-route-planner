import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { dbErrorResponse } from '@/lib/db/errors'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: Request, { params }: Params) {
  try {
    const { id } = await params
    const db = getDb()
    const [row] = await db
      .select({
        avatarMime: users.avatarMime,
        avatarData: users.avatarData,
      })
      .from(users)
      .where(eq(users.id, id))
      .limit(1)

    if (!row?.avatarMime || !row.avatarData) {
      return new NextResponse(null, { status: 404 })
    }

    const body = Buffer.from(row.avatarData, 'base64')
    return new NextResponse(body, {
      headers: {
        'Content-Type': row.avatarMime,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[avatar GET]')
    if (dbErr) return dbErr
    return new NextResponse(null, { status: 500 })
  }
}
