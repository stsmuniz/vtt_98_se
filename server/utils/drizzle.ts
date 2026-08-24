import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema'

// caminho do arquivo .sqlite (ex: "./data/vtt.db" ou o valor do .env)
const sqlite = new Database(process.env.DATABASE_URL || './sqlite.db')

const db = drizzle(sqlite, { schema })

export function useDrizzle() {
    return db
}

export const tables = schema

export type User = typeof schema.user.$inferSelect
export type Token = typeof schema.tokensTable.$inferSelect
export type Scenario = typeof schema.scenariosTable.$inferSelect
export type Scene = typeof schema.scenesTable.$inferSelect
