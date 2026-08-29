import {defineConfig} from "drizzle-kit";

const supabaseHost = new URL(process.env.SUPABASE_URL!).hostname

export default defineConfig({
    out: "./drizzle",
    schema: './server/db/schema.ts',
    dialect: 'postgresql',
    dbCredentials: {
        host: `db.${supabaseHost}`,
        port: 5432,
        user: 'postgres',
        password: process.env.SUPABASE_PASSWORD!,
        database: 'postgres',
        ssl: 'require',
    },
})
