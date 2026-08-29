const { defineConfig } = require('drizzle-kit')

const supabaseHost = new URL(process.env.SUPABASE_URL).hostname

module.exports = defineConfig({
  out: './drizzle',
  schema: './server/db/schema.cjs',
  dialect: 'postgresql',
  dbCredentials: {
    host: `db.${supabaseHost}`,
    port: 5432,
    user: 'postgres',
    password: process.env.SUPABASE_PASSWORD,
    database: 'postgres',
    ssl: 'require',
  },
})
