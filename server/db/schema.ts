import { relations, sql } from 'drizzle-orm'
import { index, int, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core'

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

export const user = sqliteTable('user', {
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

export const session = sqliteTable(
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

export const account = sqliteTable(
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

export const verification = sqliteTable(
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

export const tokensTable = sqliteTable('tokens', {
    id: int('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    image: text('image').notNull(),
    width: int('width').notNull(),
    height: int('height').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    attributes: text('attributes', { mode: 'json' }).$type<Attribute[]>(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
})

export const scenariosTable = sqliteTable('scenarios', {
    id: int('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    image: text('image').notNull(),
    width: int('width').notNull(),
    height: int('height').notNull(),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
})

export const scenesTable = sqliteTable('scenes', {
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
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    tokens: text('tokens', { mode: 'json' }).$type<SceneToken[]>(),
    startingPosition: text('starting_position', { mode: 'json' })
        .$type<{ x: number; y: number } | null>(),
    createdAt: int('created_at', { mode: 'timestamp_ms' })
        .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: int('updated_at', { mode: 'timestamp_ms' })
        .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
        .$onUpdate(() => new Date()),
})

export const roomsTable = sqliteTable('rooms', {
    id: int('id').primaryKey({ autoIncrement: true }),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    password: text('password'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    userId: text('user_id')
        .notNull()
        .references(() => user.id, { onDelete: 'cascade' }),
    sceneId: int('scene_id')
        .references(() => scenesTable.id, { onDelete: 'set null' }),
    snapshot: text('snapshot', { mode: 'json' })
        .$type<RoomSceneSnapshot>(),
    initiative: text('initiative', { mode: 'json' })
        .$type<SceneInitiativeEntry[]>()
        .default(sql`'[]'`),
    isOpen: int('is_open', { mode: 'boolean' }).notNull().default(true),
    createdAt: int('created_at', { mode: 'timestamp_ms' })
        .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: int('updated_at', { mode: 'timestamp_ms' })
        .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
        .$onUpdate(() => new Date()),
})

export const roomPlayersTable = sqliteTable(
    'room_players',
    {
        id: int('id').primaryKey({ autoIncrement: true }),
        roomId: int('room_id')
            .notNull()
            .references(() => roomsTable.id, { onDelete: 'cascade' }),
        userId: text('user_id')
            .notNull()
            .references(() => user.id, { onDelete: 'cascade' }),
        role: text('role').notNull().$type<RoomPlayerRole>(),
        joinedAt: int('joined_at', { mode: 'timestamp_ms' })
            .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
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
