import postgres from 'postgres'

const supabaseHost = new URL(process.env.SUPABASE_URL).hostname

const sql = postgres({
  host: `db.${supabaseHost}`,
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: process.env.SUPABASE_PASSWORD,
  ssl: 'require',
})

const rows = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
console.log(rows)
await sql.end()
