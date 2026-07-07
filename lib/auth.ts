import bcrypt from 'bcryptjs'
import { getIronSession, type SessionOptions } from 'iron-session'
import { cookies } from 'next/headers'
import {
  allocatePublicCode,
  findUserByCode as findStoredUserByCode,
  findUserById,
  type StoredUser,
} from '@/lib/csv-store'
import { displayUserId, parseLoginCode } from '@/lib/user-code'
import type { PublicUser, SessionData } from '@/lib/auth-types'

const PIN_RE = /^\d{4,6}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const HEX_RE = /^#[0-9A-Fa-f]{6}$/

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

export function validateEmail(email: string): string | null {
  const v = email.trim().toLowerCase()
  if (!EMAIL_RE.test(v)) return 'Enter a valid email address'
  return null
}

export function validatePin(pin: string): string | null {
  if (!PIN_RE.test(pin)) return 'PIN must be 4–6 digits'
  return null
}

export function validateColorHex(colorHex: string): string | null {
  if (!HEX_RE.test(colorHex)) return 'Pick a valid hex color (#RRGGBB)'
  return null
}

export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, 12)
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  return bcrypt.compare(pin, pinHash)
}

export function toPublicUser(row: StoredUser): PublicUser {
  return {
    id: row.id,
    publicCode: row.publicCode,
    displayId: displayUserId(row.publicCode),
    email: row.email,
    colorHex: row.colorHex,
  }
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

export { allocatePublicCode }

export async function findUserByCode(codeInput: string) {
  const publicCode = parseLoginCode(codeInput)
  if (!publicCode) return null
  return findStoredUserByCode(publicCode)
}
