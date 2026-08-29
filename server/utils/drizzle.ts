import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../db/schema'

// Conecta via Supavisor (connection pooler do Supabase), em modo transaction
// (porta 6543) — a conexão direta (db.<ref>.supabase.co) só resolve por IPv6, e as
// Functions da Vercel não têm saída IPv6, então essa conexão nunca funcionaria em
// produção. O pooler usa um host regional (SUPABASE_POOLER_HOST) e o usuário
// "postgres.<ref>" em vez de "postgres".
const supabaseRef = new URL(process.env.SUPABASE_URL!).hostname.split('.')[0]

const client = postgres({
    host: process.env.SUPABASE_POOLER_HOST!,
    port: 6543,
    database: 'postgres',
    username: `postgres.${supabaseRef}`,
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
