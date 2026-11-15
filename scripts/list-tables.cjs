const postgres = require('postgres')
const { supabaseSsl } = require('../server/db/ssl.cjs')

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

sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
  .then((rows) => {
    console.log(rows)
    return sql.end()
  })
