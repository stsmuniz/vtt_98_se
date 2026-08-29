const { relations, sql } = require('drizzle-orm')
const { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, unique } = require('drizzle-orm/pg-core')

const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .default(false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at', { mode: 'date' })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
})

const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at', { mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
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

const account = pgTable(
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
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      mode: 'date',
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      mode: 'date',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)],
)

const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
)

const tokensTable = pgTable('tokens', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  image: text('image').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  tags: jsonb('tags'),
  attributes: jsonb('attributes'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

const scenariosTable = pgTable('scenarios', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  image: text('image').notNull(),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  tags: jsonb('tags'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

const scenesTable = pgTable('scenes', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  scenarioId: integer('scenario_id')
    .notNull()
    .references(() => scenariosTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  tags: jsonb('tags'),
  tokens: jsonb('tokens'),
  startingPosition: jsonb('starting_position'),
  createdAt: timestamp('created_at', { mode: 'date' })
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
})

const roomsTable = pgTable('rooms', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  password: text('password'),
  tags: jsonb('tags'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  sceneId: integer('scene_id').references(() => scenesTable.id, {
    onDelete: 'set null',
  }),
  snapshot: jsonb('snapshot'),
  initiative: jsonb('initiative').default([]),
  isOpen: boolean('is_open').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' })
    .defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' })
    .defaultNow()
    .$onUpdate(() => new Date()),
})

const roomPlayersTable = pgTable(
  'room_players',
  {
    id: serial('id').primaryKey(),
    roomId: integer('room_id')
      .notNull()
      .references(() => roomsTable.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    joinedAt: timestamp('joined_at', { mode: 'date' })
      .defaultNow(),
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
