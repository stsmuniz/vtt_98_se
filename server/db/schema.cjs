const { relations, sql } = require('drizzle-orm')
const { index, int, sqliteTable, text, unique } = require('drizzle-orm/sqlite-core')

const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: int('email_verified', { mode: 'boolean' })
    .default(false)
    .notNull(),
  image: text('image'),
  createdAt: int('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .notNull(),
  updatedAt: int('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date())
    .notNull(),
})

const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: int('expires_at', { mode: 'timestamp_ms' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: int('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: int('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [index('session_userId_idx').on(table.userId)],
)

const account = sqliteTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: int('access_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    refreshTokenExpiresAt: int('refresh_token_expires_at', {
      mode: 'timestamp_ms',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: int('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: int('updated_at', { mode: 'timestamp_ms' })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: int('expires_at', { mode: 'timestamp_ms' }).notNull(),
    createdAt: int('created_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: int('updated_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

const tokensTable = sqliteTable('tokens', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  image: text('image').notNull(),
  width: int('width').notNull(),
  height: int('height').notNull(),
  tags: text('tags', { mode: 'json' }),
  attributes: text('attributes', { mode: 'json' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

const scenariosTable = sqliteTable('scenarios', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  image: text('image').notNull(),
  width: int('width').notNull(),
  height: int('height').notNull(),
  tags: text('tags', { mode: 'json' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

const scenesTable = sqliteTable('scenes', {
  id: int('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  scenarioId: int('scenario_id')
    .notNull()
    .references(() => scenariosTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  width: int('width').notNull(),
  height: int('height').notNull(),
  tags: text('tags', { mode: 'json' }),
  tokens: text('tokens', { mode: 'json' }),
  startingPosition: text('starting_position', { mode: 'json' }),
  createdAt: int('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: int('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()),
})

const roomsTable = sqliteTable('rooms', {
  id: int('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  sourceSceneId: int('source_scene_id').references(() => scenesTable.id, {
    onDelete: 'set null',
  }),
  snapshot: text('snapshot', { mode: 'json' }).notNull(),
  initiative: text('initiative', { mode: 'json' }).default(sql`'[]'`),
  isOpen: int('is_open', { mode: 'boolean' }).notNull().default(true),
  createdAt: int('created_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  updatedAt: int('updated_at', { mode: 'timestamp_ms' })
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
    .$onUpdate(() => new Date()),
})

const roomPlayersTable = sqliteTable(
  'room_players',
  {
    id: int('id').primaryKey({ autoIncrement: true }),
    roomId: int('room_id')
      .notNull()
      .references(() => roomsTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    joinedAt: int('joined_at', { mode: 'timestamp_ms' })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
  },
  (table) => ({
    unq: unique().on(table.roomId, table.userId),
  }),
)

module.exports = {
  user,
  session,
  account,
  verification,
  tokensTable,
  scenariosTable,
  scenesTable,
  roomsTable,
  roomPlayersTable,
  relations,
  sql,
}
