import {
  doublePrecision,
  json,
  integer,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const userCodeSeq = pgSequence('user_code_seq')

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  publicCode: text('public_code').notNull().unique(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  email: text('email').unique(),
  displayName: text('display_name'),
  bio: text('bio'),
  location: text('location'),
  avatarMime: text('avatar_mime'),
  avatarData: text('avatar_data'),
  colorHex: text('color_hex').notNull(),
  colorChangedAt: timestamp('color_changed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
})

export const claimedTiles = pgTable(
  'claimed_tiles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tileKey: text('tile_key').notNull(),
    claimedAt: timestamp('claimed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.tileKey] })],
)

export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  startName: text('start_name').notNull(),
  startLat: doublePrecision('start_lat').notNull(),
  startLng: doublePrecision('start_lng').notNull(),
  endName: text('end_name').notNull(),
  endLat: doublePrecision('end_lat').notNull(),
  endLng: doublePrecision('end_lng').notNull(),
  distanceM: integer('distance_m').notNull(),
  durationS: integer('duration_s').notNull(),
  tilesAdded: text('tiles_added').array().notNull().default([]),
  routeCoords: json('route_coords')
    .$type<[number, number][]>()
    .notNull()
    .default([]),
  drivenAt: timestamp('driven_at', { withTimezone: true }).defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type Trip = typeof trips.$inferSelect
