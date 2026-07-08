import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import { claimedTiles, savedRoutes, trips, users } from '@/lib/db/schema'
import {
  requireUser,
  requireUserRow,
  toPublicUser,
  validateColorHex,
} from '@/lib/auth'
import type { MeResponse } from '@/lib/auth-types'
import { dbErrorResponse } from '@/lib/db/errors'
import { tripToSummary } from '@/lib/trips'
import { savedRouteToSummary } from '@/lib/saved-routes'
import { normalizeStoredTileKeys } from '@/lib/tile-migration'
import {
  colorChangeStatus,
  validateBio,
  validateDisplayName,
  validateLocation,
  validateAvatarBuffer,
} from '@/lib/profile'

export const dynamic = 'force-dynamic'

type ProfileBody = {
  displayName?: string
  bio?: string
  location?: string
}

type ColorBody = {
  colorHex?: string
}

export async function GET() {
  try {
    const user = await requireUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const db = getDb()
    const [tileRows, tripRows, savedRows] = await Promise.all([
      db
        .select({ tileKey: claimedTiles.tileKey })
        .from(claimedTiles)
        .where(eq(claimedTiles.userId, user.id)),
      db
        .select()
        .from(trips)
        .where(eq(trips.userId, user.id))
        .orderBy(desc(trips.drivenAt))
        .limit(50),
      db
        .select()
        .from(savedRoutes)
        .where(eq(savedRoutes.userId, user.id))
        .orderBy(desc(savedRoutes.savedAt))
        .limit(50),
    ])

    const payload: MeResponse = {
      user,
      claimedTiles: normalizeStoredTileKeys(tileRows.map((r) => r.tileKey)),
      trips: tripRows.map(tripToSummary),
      savedRoutes: savedRows.map(savedRouteToSummary),
    }
    return NextResponse.json(payload)
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[me]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Could not load account' }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const row = await requireUserRow()
    if (!row) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    if (action === 'color') {
      const body = (await req.json()) as ColorBody
      const colorHex = (body.colorHex ?? '').toUpperCase()
      const colorErr = validateColorHex(colorHex)
      if (colorErr) {
        return NextResponse.json({ error: colorErr }, { status: 400 })
      }

      const status = colorChangeStatus(row.colorChangedAt)
      if (!status.allowed) {
        return NextResponse.json(
          {
            error: 'You can change your map color once per hour',
            colorChangeAvailableAt: status.availableAt?.toISOString() ?? null,
          },
          { status: 429 },
        )
      }

      if (colorHex === row.colorHex) {
        return NextResponse.json({ user: toPublicUser(row) })
      }

      const db = getDb()
      const [updated] = await db
        .update(users)
        .set({
          colorHex,
          colorChangedAt: new Date(),
        })
        .where(eq(users.id, row.id))
        .returning()

      return NextResponse.json({ user: toPublicUser(updated) })
    }

    const body = (await req.json()) as ProfileBody
    const displayName =
      body.displayName === undefined
        ? row.displayName
        : body.displayName.trim() || null
    const bio =
      body.bio === undefined ? row.bio : body.bio.trim() || null
    const location =
      body.location === undefined ? row.location : body.location.trim() || null

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

    const db = getDb()
    const [updated] = await db
      .update(users)
      .set({ displayName, bio, location })
      .where(eq(users.id, row.id))
      .returning()

    return NextResponse.json({ user: toPublicUser(updated) })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[me PATCH]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Could not update profile' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const row = await requireUserRow()
    if (!row) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const url = new URL(req.url)
    if (url.searchParams.get('action') !== 'avatar') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }

    const form = await req.formData()
    const file = form.get('avatar')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Choose an image file' }, { status: 400 })
    }

    const mime = file.type || 'application/octet-stream'
    const bytes = new Uint8Array(await file.arrayBuffer())
    const avatarErr = validateAvatarBuffer(bytes, mime)
    if (avatarErr) {
      return NextResponse.json({ error: avatarErr }, { status: 400 })
    }

    const avatarData = Buffer.from(bytes).toString('base64')
    const db = getDb()
    const [updated] = await db
      .update(users)
      .set({ avatarMime: mime, avatarData })
      .where(eq(users.id, row.id))
      .returning()

    return NextResponse.json({ user: toPublicUser(updated) })
  } catch (err) {
    const dbErr = dbErrorResponse(err, '[me avatar]')
    if (dbErr) return dbErr
    return NextResponse.json({ error: 'Could not upload photo' }, { status: 500 })
  }
}
