import { getDb } from '@/lib/db'

export class DbNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not set')
    this.name = 'DbNotConfiguredError'
  }
}

export function isDbNotConfigured(err: unknown): boolean {
  return err instanceof DbNotConfiguredError
}

export function dbErrorResponse(err: unknown, logLabel: string) {
  if (isDbNotConfigured(err)) {
    return Response.json(
      {
        error:
          'Database not configured. Set DATABASE_URL in .env and run pnpm db:push',
      },
      { status: 503 },
    )
  }
  console.error(logLabel, err)
  return null
}

/** Touch getDb() so missing DATABASE_URL throws before the handler runs. */
export function requireDb() {
  getDb()
}
