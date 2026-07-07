import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { formatUserCode } from '@/lib/user-code'

const DATA_DIR = path.join(process.cwd(), 'data')

const FILES = {
  users: 'users.csv',
  tiles: 'claimed_tiles.csv',
  trips: 'trips.csv',
  seq: 'user_seq.txt',
} as const

export type StoredUser = {
  id: string
  publicCode: string
  email: string
  pinHash: string
  colorHex: string
  createdAt: string
}

export type StoredTrip = {
  id: string
  userId: string
  startName: string
  startLat: number
  startLng: number
  endName: string
  endLat: number
  endLng: number
  distanceM: number
  durationS: number
  tilesAdded: string[]
  drivenAt: string
}

async function ensureDataDir() {
  await mkdir(DATA_DIR, { recursive: true })
}

function filePath(name: keyof typeof FILES) {
  return path.join(DATA_DIR, FILES[name])
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function parseCsv(content: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    const next = content[i + 1]

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i++
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
      row.push(field)
      field = ''
      if (row.some((c) => c.length > 0)) rows.push(row)
      row = []
      if (ch === '\r') i++
    } else {
      field += ch
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    if (row.some((c) => c.length > 0)) rows.push(row)
  }

  return rows
}

function toCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsv).join(',')).join('\n') + '\n'
}

async function readCsv(name: keyof typeof FILES): Promise<string[][]> {
  await ensureDataDir()
  try {
    const raw = await readFile(filePath(name), 'utf8')
    if (!raw.trim()) return []
    return parseCsv(raw)
  } catch {
    return []
  }
}

async function writeCsv(name: keyof typeof FILES, rows: string[][]) {
  await ensureDataDir()
  await writeFile(filePath(name), toCsv(rows), 'utf8')
}

const USER_HEADER = [
  'id',
  'public_code',
  'email',
  'pin_hash',
  'color_hex',
  'created_at',
] as const

const TILE_HEADER = ['user_id', 'tile_key', 'claimed_at'] as const

const TRIP_HEADER = [
  'id',
  'user_id',
  'start_name',
  'start_lat',
  'start_lng',
  'end_name',
  'end_lat',
  'end_lng',
  'distance_m',
  'duration_s',
  'tiles_added',
  'driven_at',
] as const

function rowToUser(cells: string[]): StoredUser {
  return {
    id: cells[0],
    publicCode: cells[1],
    email: cells[2],
    pinHash: cells[3],
    colorHex: cells[4],
    createdAt: cells[5],
  }
}

function userToRow(u: StoredUser): string[] {
  return [
    u.id,
    u.publicCode,
    u.email,
    u.pinHash,
    u.colorHex,
    u.createdAt,
  ]
}

function rowToTrip(cells: string[]): StoredTrip {
  return {
    id: cells[0],
    userId: cells[1],
    startName: cells[2],
    startLat: Number(cells[3]),
    startLng: Number(cells[4]),
    endName: cells[5],
    endLat: Number(cells[6]),
    endLng: Number(cells[7]),
    distanceM: Number(cells[8]),
    durationS: Number(cells[9]),
    tilesAdded: cells[10] ? cells[10].split('|').filter(Boolean) : [],
    drivenAt: cells[11],
  }
}

function tripToRow(t: StoredTrip): string[] {
  return [
    t.id,
    t.userId,
    t.startName,
    String(t.startLat),
    String(t.startLng),
    t.endName,
    String(t.endLat),
    String(t.endLng),
    String(t.distanceM),
    String(t.durationS),
    t.tilesAdded.join('|'),
    t.drivenAt,
  ]
}

async function readUsers(): Promise<StoredUser[]> {
  const rows = await readCsv('users')
  if (!rows.length) return []
  const [header, ...body] = rows
  if (header.join(',') !== USER_HEADER.join(',')) {
    if (body.length === 0 && header[0] === 'id') return []
    throw new Error('users.csv header mismatch')
  }
  return body.map(rowToUser)
}

async function writeUsers(users: StoredUser[]) {
  await writeCsv('users', [USER_HEADER as unknown as string[], ...users.map(userToRow)])
}

export async function allocatePublicCode(): Promise<string> {
  await ensureDataDir()
  const seqPath = filePath('seq')
  let seq = 0
  try {
    const raw = await readFile(seqPath, 'utf8')
    seq = Number.parseInt(raw.trim(), 10) || 0
  } catch {
    seq = 0
  }
  seq += 1
  await writeFile(seqPath, String(seq), 'utf8')
  return formatUserCode(seq)
}

export async function findUserById(id: string): Promise<StoredUser | null> {
  const users = await readUsers()
  return users.find((u) => u.id === id) ?? null
}

export async function findUserByCode(
  publicCode: string,
): Promise<StoredUser | null> {
  const users = await readUsers()
  return users.find((u) => u.publicCode === publicCode) ?? null
}

export async function findUserByEmail(
  email: string,
): Promise<StoredUser | null> {
  const users = await readUsers()
  const norm = email.trim().toLowerCase()
  return users.find((u) => u.email === norm) ?? null
}

export async function createUser(input: {
  publicCode: string
  email: string
  pinHash: string
  colorHex: string
}): Promise<StoredUser> {
  const users = await readUsers()
  const norm = input.email.trim().toLowerCase()
  if (users.some((u) => u.email === norm)) {
    throw new Error('duplicate email')
  }
  if (users.some((u) => u.publicCode === input.publicCode)) {
    throw new Error('duplicate public_code')
  }

  const user: StoredUser = {
    id: randomUUID(),
    publicCode: input.publicCode,
    email: norm,
    pinHash: input.pinHash,
    colorHex: input.colorHex,
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  await writeUsers(users)
  return user
}

export async function getClaimedTiles(userId: string): Promise<string[]> {
  const rows = await readCsv('tiles')
  if (!rows.length) return []
  const [header, ...body] = rows
  const hasHeader = header[0] === 'user_id'
  const data = hasHeader ? body : rows
  return data.filter((r) => r[0] === userId).map((r) => r[hasHeader ? 1 : 1])
}

export async function claimTiles(
  userId: string,
  tileKeys: string[],
): Promise<string[]> {
  const rows = await readCsv('tiles')
  let header: string[] = TILE_HEADER as unknown as string[]
  let body: string[][] = []

  if (!rows.length) {
    body = []
  } else if (rows[0][0] === 'user_id') {
    header = rows[0]
    body = rows.slice(1)
  } else {
    body = rows
  }

  const existing = new Set(
    body.filter((r) => r[0] === userId).map((r) => r[1]),
  )
  const now = new Date().toISOString()
  const added: string[] = []

  for (const tileKey of tileKeys) {
    if (existing.has(tileKey)) continue
    existing.add(tileKey)
    added.push(tileKey)
    body.push([userId, tileKey, now])
  }

  await writeCsv('tiles', [header, ...body])
  return added
}

export async function clearClaimedTiles(userId: string): Promise<void> {
  const rows = await readCsv('tiles')
  if (!rows.length) return

  const hasHeader = rows[0][0] === 'user_id'
  const header = hasHeader ? rows[0] : (TILE_HEADER as unknown as string[])
  const body = (hasHeader ? rows.slice(1) : rows).filter((r) => r[0] !== userId)
  await writeCsv('tiles', [header, ...body])
}

export async function getTrips(userId: string, limit = 50): Promise<StoredTrip[]> {
  const rows = await readCsv('trips')
  if (!rows.length) return []

  const hasHeader = rows[0][0] === 'id'
  const body = hasHeader ? rows.slice(1) : rows
  return body
    .map(rowToTrip)
    .filter((t) => t.userId === userId)
    .sort((a, b) => b.drivenAt.localeCompare(a.drivenAt))
    .slice(0, limit)
}

export async function addTrip(
  userId: string,
  input: Omit<StoredTrip, 'id' | 'userId' | 'drivenAt' | 'tilesAdded'> & {
    tilesAdded: string[]
  },
): Promise<StoredTrip> {
  const rows = await readCsv('trips')
  let header: string[] = TRIP_HEADER as unknown as string[]
  let body: string[][] = []

  if (!rows.length) {
    body = []
  } else if (rows[0][0] === 'id') {
    header = rows[0]
    body = rows.slice(1)
  } else {
    body = rows
  }

  const trip: StoredTrip = {
    id: randomUUID(),
    userId,
    ...input,
    drivenAt: new Date().toISOString(),
  }
  body.push(tripToRow(trip))
  await writeCsv('trips', [header, ...body])
  return trip
}

export function tripToSummary(trip: StoredTrip) {
  return {
    id: trip.id,
    startName: trip.startName,
    endName: trip.endName,
    distanceM: trip.distanceM,
    durationS: trip.durationS,
    tilesAdded: trip.tilesAdded,
    drivenAt: trip.drivenAt,
  }
}
