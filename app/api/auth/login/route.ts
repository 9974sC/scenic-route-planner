import { NextResponse } from 'next/server'
import {
  findUserByUsername,
  getSession,
  toPublicUser,
  validatePassword,
  validateUsername,
  verifyPassword,
} from '@/lib/auth'
import { dbErrorResponse } from '@/lib/db/errors'

export const dynamic = 'force-dynamic'

type Body = {
  username?: string
  password?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const username = body.username ?? ''
    const password = body.password ?? ''

    const usernameErr = validateUsername(username)
    if (usernameErr) {
      return NextResponse.json({ error: usernameErr }, { status: 400 })
    }
    const passwordErr = validatePassword(password)
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 })
    }

    const row = await findUserByUsername(username)
    if (!row) {
      return NextResponse.json(
        { error: 'No account with that username' },
        { status: 401 },
      )
    }

    const ok = await verifyPassword(password, row.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Wrong password' }, { status: 401 })
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
