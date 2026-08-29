import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../db/schema'

// conecta no Postgres do Supabase via conexão direta (host derivado de SUPABASE_URL)
const supabaseHost = new URL(process.env.SUPABASE_URL!).hostname

const client = postgres({
    host: `db.${supabaseHost}`,
    port: 5432,
    database: 'postgres',
    username: 'postgres',
    password: process.env.SUPABASE_PASSWORD!,
    ssl: 'require',
})

const db = drizzle(client, { schema })

export function useDrizzle() {
    return db
}

export const tables = schema

export type User = typeof schema.user.$inferSelect
export type Token = typeof schema.tokensTable.$inferSelect
export type Scenario = typeof schema.scenariosTable.$inferSelect
export type Scene = typeof schema.scenesTable.$inferSelect
export type Room = typeof schema.roomsTable.$inferSelect
