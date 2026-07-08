import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { dbErrorResponse } from '@/lib/db/errors'
import { users } from '@/lib/db/schema'
import {
  allocatePublicCode,
  duplicateUserMessage,
  getSession,
  hashPassword,
  normalizeUsername,
  toPublicUser,
  validateColorHex,
  validatePassword,
  validateUsername,
} from '@/lib/auth'
import {
  validateBio,
  validateDisplayName,
  validateLocation,
} from '@/lib/profile'

export const dynamic = 'force-dynamic'

type Body = {
  username?: string
  password?: string
  colorHex?: string
  displayName?: string
  bio?: string
  location?: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const username = body.username ?? ''
    const password = body.password ?? ''
    const colorHex = (body.colorHex ?? '#2563eb').toUpperCase()
    const displayName = body.displayName?.trim() || null
    const bio = body.bio?.trim() || null
    const location = body.location?.trim() || null

    const usernameErr = validateUsername(username)
    if (usernameErr) {
      return NextResponse.json({ error: usernameErr }, { status: 400 })
    }
    const passwordErr = validatePassword(password)
    if (passwordErr) {
      return NextResponse.json({ error: passwordErr }, { status: 400 })
    }
    const colorErr = validateColorHex(colorHex)
    if (colorErr) {
      return NextResponse.json({ error: colorErr }, { status: 400 })
    }
    const displayNameErr = displayName
      ? validateDisplayName(displayName)
      : null
    if (displayNameErr) {
      return NextResponse.json({ error: displayNameErr }, { status: 400 })
    }
    const bioErr = bio ? validateBio(bio) : null
    if (bioErr) return NextResponse.json({ error: bioErr }, { status: 400 })
    const locationErr = location ? validateLocation(location) : null
    if (locationErr) {
      return NextResponse.json({ error: locationErr }, { status: 400 })
    }

    const publicCode = await allocatePublicCode()
    const passwordHash = await hashPassword(password)

    const db = getDb()
    const [created] = await db
      .insert(users)
      .values({
        publicCode,
        username: normalizeUsername(username),
        passwordHash,
        displayName,
        bio,
        location,
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
      savedRoutes: [],
    })
  } catch (err: unknown) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code: string }).code)
        : ''
    const dup = duplicateUserMessage(code)
    if (dup) return NextResponse.json({ error: dup }, { status: 409 })

    const dbErr = dbErrorResponse(err, '[register]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
