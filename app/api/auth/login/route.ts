import { NextResponse } from 'next/server'
import { findUserByCode, getSession, toPublicUser, validatePin, verifyPin } from '@/lib/auth'
import { dbErrorResponse } from '@/lib/db/errors'
import { parseLoginCode } from '@/lib/user-code'

export const dynamic = 'force-dynamic'

type Body = {
  code?: string
  pin?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const code = body.code ?? ''
    const pin = body.pin ?? ''

    if (!parseLoginCode(code)) {
      return NextResponse.json(
        { error: 'Enter your code like AA0001' },
        { status: 400 },
      )
    }
    const pinErr = validatePin(pin)
    if (pinErr) return NextResponse.json({ error: pinErr }, { status: 400 })

    const row = await findUserByCode(code)
    if (!row) {
      return NextResponse.json(
        { error: 'No account with that code' },
        { status: 401 },
      )
    }

    const ok = await verifyPin(pin, row.pinHash)
    if (!ok) {
      return NextResponse.json({ error: 'Wrong PIN' }, { status: 401 })
    }

    const session = await getSession()
    session.userId = row.id
    await session.save()

    return NextResponse.json({ user: toPublicUser(row) })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[login]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
