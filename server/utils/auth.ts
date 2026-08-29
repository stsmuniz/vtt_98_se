import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { useDrizzle } from "./drizzle.ts"
import * as schema from "../db/schema"

const db = useDrizzle()

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        schema,
        provider: "pg"
    }),
    emailAndPassword: {
        enabled: true,
    },
})
