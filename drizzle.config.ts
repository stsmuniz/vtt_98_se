import {defineConfig} from "drizzle-kit";

// Usa o pooler (modo session, porta 5432) em vez da conexão direta: a conexão
// direta (db.<ref>.supabase.co) só resolve por IPv6, o que quebra em redes/ambientes
// sem saída IPv6. Ver server/utils/drizzle.ts para a conexão em runtime (modo
// transaction, porta 6543).
const supabaseRef = new URL(process.env.SUPABASE_URL!).hostname.split('.')[0]

export default defineConfig({
    out: "./drizzle",
    schema: './server/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        host: process.env.SUPABASE_POOLER_HOST!,
        port: 5432,
        user: `postgres.${supabaseRef}`,
        password: process.env.SUPABASE_PASSWORD!,
        database: 'postgres',
        ssl: 'require',
    },
})
