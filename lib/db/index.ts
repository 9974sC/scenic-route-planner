import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { DbNotConfiguredError } from './errors'
import * as schema from './schema'

let db: ReturnType<typeof drizzle<typeof schema>> | null = null

export function getDb() {
  if (db) return db

  const url = process.env.DATABASE_URL?.trim()
  if (!url) {
    throw new DbNotConfiguredError()
  }

  db = drizzle(neon(url), { schema })
  return db
}

export { schema }
