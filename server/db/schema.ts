import { relations, sql } from 'drizzle-orm'
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core'

export type TokenStatus = 'normal' | 'machucado' | 'morrendo'

export type Attribute = {
    name: string
    value: string
}

export type SceneAttribute = Attribute & {
    visibility?: 'visible' | 'hidden'
    currentValue?: string
    maxValue?: string
}

export type SceneToken = {
    id: number
    tokenId?: number
    baseName?: string
    name: string
    image: string
    x: number
    y: number
    scaleX: number
    scaleY: number
    width: number
    height: number
    opacity: number
    rotation: number
    attributes: Attribute[]
}

export type RoomToken = Omit<SceneToken, "attributes"> & {
    status: TokenStatus
    attributes: SceneAttribute[]
    userId?: typeof user.id
}

export type SceneInitiativeEntry = {
    name: string
    tokenId: typeof tokensTable.id
    value: string
}

export type RoomSceneSnapshot = {
    sceneId: typeof scenesTable.id
    width: number
    height: number
    tokens: RoomToken[]
    startingPosition?: { x: number; y: number } | null
}

export type RoomPlayerRole = 'owner' | 'gm' | 'player' | 'spectator'

export const user = pgTable('user', {
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

export const session = pgTable(
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

export const account = pgTable(
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

export const verification = pgTable(
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

export const tokensTable = pgTable('tokens', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    image: text('image').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    tags: jsonb('tags').$type<string[]>(),
    attributes: jsonb('attributes').$type<Attribute[]>(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
})

export const scenariosTable = pgTable('scenarios', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    image: text('image').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    tags: jsonb('tags').$type<string[]>(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
})

export const scenesTable = pgTable('scenes', {
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
    tags: jsonb('tags').$type<string[]>(),
    tokens: jsonb('tokens').$type<SceneToken[]>(),
    startingPosition: jsonb('starting_position')
        .$type<{ x: number; y: number } | null>(),
    createdAt: timestamp('created_at', { mode: 'date' })
        .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
        .defaultNow()
        .$onUpdate(() => new Date()),
})

export const roomsTable = pgTable('rooms', {
    id: serial('id').primaryKey(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    password: text('password'),
    tags: jsonb('tags').$type<string[]>(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    sceneId: integer('scene_id')
        .references(() => scenesTable.id, { onDelete: 'set null' }),
    snapshot: jsonb('snapshot')
        .$type<RoomSceneSnapshot>(),
    initiative: jsonb('initiative')
        .$type<SceneInitiativeEntry[]>()
        .default([]),
    isOpen: boolean('is_open').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'date' })
        .defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
        .defaultNow()
        .$onUpdate(() => new Date()),
})

export const roomPlayersTable = pgTable(
    'room_players',
    {
        id: serial('id').primaryKey(),
        roomId: integer('room_id')
            .notNull()
            .references(() => roomsTable.id, { onDelete: 'cascade' }),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        role: text('role').notNull().$type<RoomPlayerRole>(),
        joinedAt: timestamp('joined_at', { mode: 'date' })
            .defaultNow(),
    },
    (table) => ({
        unq: unique().on(table.roomId, table.userId),
    }),
)

export const userRelations = relations(user, ({ many }) => ({
    sessions: many(session),
    accounts: many(account),
    tokens: many(tokensTable),
    scenarios: many(scenariosTable),
    scenes: many(scenesTable),
    ownedRooms: many(roomsTable),
    roomMemberships: many(roomPlayersTable),
}))

export const sessionRelations = relations(session, ({ one }) => ({
    user: one(user, {
        fields: [session.userId],
        references: [user.id],
    }),
}))

export const accountRelations = relations(account, ({ one }) => ({
    user: one(user, {
        fields: [account.userId],
        references: [user.id],
    }),
}))

export const tokensRelations = relations(tokensTable, ({ one }) => ({
    user: one(user, {
        fields: [tokensTable.userId],
        references: [user.id],
    }),
}))

export const scenariosRelations = relations(scenariosTable, ({ many, one }) => ({
    scenes: many(scenesTable),
    user: one(user, {
        fields: [scenariosTable.userId],
        references: [user.id],
    }),
}))

export const scenesRelations = relations(scenesTable, ({ one, many }) => ({
    scenario: one(scenariosTable, {
        fields: [scenesTable.scenarioId],
        references: [scenariosTable.id],
    }),
    user: one(user, {
        fields: [scenesTable.userId],
        references: [user.id],
    }),
    roomsFromSource: many(roomsTable),
}))

export const roomsRelations = relations(roomsTable, ({ one, many }) => ({
    owner: one(user, {
        fields: [roomsTable.userId],
        references: [user.id],
    }),
    sourceScene: one(scenesTable, {
        fields: [roomsTable.sceneId],
        references: [scenesTable.id],
    }),
    players: many(roomPlayersTable),
}))

export const roomPlayersRelations = relations(roomPlayersTable, ({ one }) => ({
    room: one(roomsTable, {
        fields: [roomPlayersTable.roomId],
        references: [roomsTable.id],
    }),
    user: one(user, {
        fields: [roomPlayersTable.userId],
        references: [user.id],
    }),
}))
