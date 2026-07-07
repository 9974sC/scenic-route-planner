import { NextResponse } from 'next/server'
import { createUser, allocatePublicCode } from '@/lib/csv-store'
import {
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

    const created = await createUser({
      publicCode,
      email,
      pinHash,
      colorHex,
    })

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
    if (msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'That email is already registered' },
        { status: 409 },
      )
    }
    console.error('[register]', err)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
