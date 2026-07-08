/**
 * Seeds four leaderboard bot users with avatars and Warsaw-area tile coverage.
 * Run: pnpm db:seed-bots  (requires DATABASE_URL in .env.local)
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { eq } from 'drizzle-orm'
import {
  allocatePublicCode,
  findUserByUsername,
  hashPassword,
  normalizeUsername,
} from '@/lib/auth'
import { getDb } from '@/lib/db'
import { claimedTiles, users } from '@/lib/db/schema'
import {
  LEADERBOARD_BOT_PASSWORD,
  LEADERBOARD_BOTS,
  botAvatarData,
  tilePatchKeys,
} from '@/lib/leaderboard-bots'

function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const path = resolve(process.cwd(), name)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx <= 0) continue
      const key = trimmed.slice(0, eqIdx).trim()
      if (process.env[key]) continue
      let value = trimmed.slice(eqIdx + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  }
}

async function main() {
  loadEnvFiles()

  if (!process.env.DATABASE_URL?.trim()) {
    console.error('DATABASE_URL is not set. Add it to .env.local and retry.')
    process.exit(1)
  }

  const db = getDb()
  const passwordHash = await hashPassword(LEADERBOARD_BOT_PASSWORD)

  for (const bot of LEADERBOARD_BOTS) {
    const username = normalizeUsername(bot.username)
    const avatar = botAvatarData(bot.avatarInitials, bot.colorHex)
    let userId: string

    const existing = await findUserByUsername(username)
    if (existing) {
      userId = existing.id
      await db
        .update(users)
        .set({
          displayName: bot.displayName,
          bio: bot.bio,
          location: bot.location,
          colorHex: bot.colorHex,
          avatarMime: avatar.avatarMime,
          avatarData: avatar.avatarData,
        })
        .where(eq(users.id, userId))
      console.log(`Updated bot @${username}`)
    } else {
      const publicCode = await allocatePublicCode()
      const [created] = await db
        .insert(users)
        .values({
          publicCode,
          username,
          passwordHash,
          displayName: bot.displayName,
          bio: bot.bio,
          location: bot.location,
          colorHex: bot.colorHex,
          avatarMime: avatar.avatarMime,
          avatarData: avatar.avatarData,
        })
        .returning({ id: users.id })
      userId = created.id
      console.log(`Created bot @${username} (${bot.displayName})`)
    }

    const keys = tilePatchKeys(
      bot.patchCenter,
      bot.patchWidth,
      bot.patchHeight,
    )
    if (!keys.length) {
      console.warn(`No tiles generated for @${username}`)
      continue
    }

    await db
      .insert(claimedTiles)
      .values(keys.map((tileKey) => ({ userId, tileKey })))
      .onConflictDoNothing()

    console.log(`  ${keys.length} tiles at ${bot.patchCenter.lat}, ${bot.patchCenter.lng}`)
  }

  console.log('Leaderboard bots ready.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
