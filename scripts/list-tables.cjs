const postgres = require('postgres')

const supabaseHost = new URL(process.env.SUPABASE_URL).hostname

const sql = postgres({
  host: `db.${supabaseHost}`,
  port: 5432,
  database: 'postgres',
  username: 'postgres',
  password: process.env.SUPABASE_PASSWORD,
  ssl: 'require',
})

sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  .then((rows) => {
    console.log(rows)
    return sql.end()
  })
