import postgres from 'postgres'
import { supabaseSsl } from '../server/db/ssl.cjs'

const sql = process.env.DATABASE_URL
  ? postgres(process.env.DATABASE_URL)
  : postgres({
      host: process.env.SUPABASE_POOLER_HOST,
      port: 5432,
      database: 'postgres',
      username: `postgres.${new URL(process.env.SUPABASE_URL).hostname.split('.')[0]}`,
      password: process.env.SUPABASE_PASSWORD,
      ssl: supabaseSsl(),
    })

const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
console.log(rows)
await sql.end()
