const { defineConfig } = require('drizzle-kit')

// Usa o pooler (modo session, porta 5432) em vez da conexão direta: ver
// drizzle.config.ts / server/utils/drizzle.ts para o motivo (IPv6-only).
const supabaseRef = new URL(process.env.SUPABASE_URL).hostname.split('.')[0]

module.exports = defineConfig({
  out: './drizzle',
  schema: './server/db/schema.cjs',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.SUPABASE_POOLER_HOST,
    port: 5432,
    user: `postgres.${supabaseRef}`,
    password: process.env.SUPABASE_PASSWORD,
    database: 'postgres',
    ssl: 'require',
  },
})
