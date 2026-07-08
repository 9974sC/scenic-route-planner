import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { dbErrorResponse } from '@/lib/db/errors'
import { users } from '@/lib/db/schema'
import {
  allocatePublicCode,
  getSession,
  hashPin,
  toPublicUser,
  validateColorHex,
  validateEmail,
  validatePin,
} from '@/lib/auth'

export const dynamic = 'force-dynamic'

type Body = {
  email?: string
  pin?: string
  colorHex?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const email = body.email ?? ''
    const pin = body.pin ?? ''
    const colorHex = (body.colorHex ?? '#2563eb').toUpperCase()

    const emailErr = validateEmail(email)
    if (emailErr) return NextResponse.json({ error: emailErr }, { status: 400 })
    const pinErr = validatePin(pin)
    if (pinErr) return NextResponse.json({ error: pinErr }, { status: 400 })
    const colorErr = validateColorHex(colorHex)
    if (colorErr) return NextResponse.json({ error: colorErr }, { status: 400 })

    const publicCode = await allocatePublicCode()
    const pinHash = await hashPin(pin)
    const norm = email.trim().toLowerCase()

    const db = getDb()
    const [created] = await db
      .insert(users)
      .values({
        publicCode,
        email: norm,
        pinHash,
        colorHex,
      })
      .returning()

    const session = await getSession()
    session.userId = created.id
    await session.save()

    return NextResponse.json({
      user: toPublicUser(created),
      claimedTiles: [] as string[],
      trips: [],
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Registration failed'
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : ''
    if (code === '23505' || msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'That email is already registered' },
        { status: 409 },
      )
    }
    const dbErr = dbErrorResponse(err, '[register]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
