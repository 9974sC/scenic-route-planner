import bcrypt from 'bcryptjs'
import { eq, sql } from 'drizzle-orm'
import { getIronSession, type SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import { getDb } from '@/lib/db'
import { users, type User } from '@/lib/db/schema'
import { displayUserId, formatUserCode } from '@/lib/user-code'
import type { PublicUser, SessionData } from '@/lib/auth-types'
import { colorChangeStatus } from '@/lib/profile'

const USERNAME_RE = /^[a-z0-9_]{3,24}$/
const HEX_RE = /^#[0-9A-Fa-f]{6}$/
const PASSWORD_MIN = 8
const PASSWORD_MAX = 128

const DEV_SESSION_FALLBACK =
  'scenic-localhost-dev-session-secret-32ch'

export function sessionOptions(): SessionOptions {
  const password =
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV === 'development' ? DEV_SESSION_FALLBACK : undefined)
  if (!password || password.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters')
  }
  return {
    password,
    cookieName: 'scenic_session',
    cookieOptions: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    },
  }
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions())
}

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase()
}

export function validateUsername(username: string): string | null {
  const v = normalizeUsername(username)
  if (!USERNAME_RE.test(v)) {
    return 'Username must be 3–24 characters: lowercase letters, numbers, underscore'
  }
  return null
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters`
  }
  if (password.length > PASSWORD_MAX) {
    return `Password must be ${PASSWORD_MAX} characters or fewer`
  }
  return null
}

export function validateColorHex(colorHex: string): string | null {
  if (!HEX_RE.test(colorHex)) return 'Pick a valid hex color (#RRGGBB)'
  return null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash)
}

export function toPublicUser(row: User): PublicUser {
  const colorStatus = colorChangeStatus(row.colorChangedAt)
  return {
    id: row.id,
    publicCode: row.publicCode,
    displayId: displayUserId(row.publicCode),
    username: row.username,
    displayName: row.displayName,
    bio: row.bio,
    location: row.location,
    colorHex: row.colorHex,
    hasAvatar: Boolean(row.avatarMime && row.avatarData),
    avatarVersion: row.avatarData?.length ?? 0,
    colorChangeAvailableAt: colorStatus.allowed
      ? null
      : colorStatus.availableAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

export async function allocatePublicCode(): Promise<string> {
  const db = getDb()
  const result = await db.execute<{ seq: string }>(
    sql`SELECT nextval('user_code_seq') AS seq`,
  )
  const seq = Number(result.rows[0]?.seq)
  if (!Number.isFinite(seq) || seq < 1) {
    throw new Error('Failed to allocate user code')
  }
  return formatUserCode(seq)
}

export async function findUserById(id: string): Promise<User | null> {
  const db = getDb()
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  return row ?? null
}

export async function findUserByUsername(
  usernameInput: string,
): Promise<User | null> {
  const username = normalizeUsername(usernameInput)
  if (!username) return null
  const db = getDb()
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1)
  return row ?? null
}

export async function requireUser() {
  const session = await getSession()
  if (!session.userId) return null
  const row = await findUserById(session.userId)
  if (!row) {
    session.destroy()
    return null
  }
  return toPublicUser(row)
}

export async function requireUserRow() {
  const session = await getSession()
  if (!session.userId) return null
  const row = await findUserById(session.userId)
  if (!row) {
    session.destroy()
    return null
  }
  return row
}

export function duplicateUserMessage(code: string): string | null {
  if (code !== '23505') return null
  return 'That username is already taken'
}
