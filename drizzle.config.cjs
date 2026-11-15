const { defineConfig } = require('drizzle-kit')
const { supabaseSsl } = require('./server/db/ssl.cjs')

// Usa o pooler (modo session, porta 5432) em vez da conexão direta: ver
// drizzle.config.ts / server/utils/drizzle.ts para o motivo (IPv6-only).
//
// Se DATABASE_URL estiver definido (Postgres local via docker-compose.yml), usa ele
// direto em vez do Supabase.
module.exports = defineConfig(
  process.env.DATABASE_URL
    ? {
        out: './drizzle',
        schema: './server/db/schema.cjs',
        dialect: 'postgresql',
        dbCredentials: {
          url: process.env.DATABASE_URL,
        },
      }
    : {
        out: './drizzle',
        schema: './server/db/schema.cjs',
        dialect: 'postgresql',
        dbCredentials: {
          host: process.env.SUPABASE_POOLER_HOST,
          port: 5432,
          user: `postgres.${new URL(process.env.SUPABASE_URL).hostname.split('.')[0]}`,
          password: process.env.SUPABASE_PASSWORD,
          database: 'postgres',
          // Confere o certificado do pooler com a CA do Supabase (ver server/db/ssl.cjs).
          ssl: supabaseSsl(),
        },
      },
)
