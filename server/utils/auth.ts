import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { useDrizzle } from "./drizzle.ts"
import * as schema from "../db/schema"
import { collectUserAssets, purgeUserAssets, type UserAssets } from "./accountCleanup"

const db = useDrizzle()

// Imagens/salas coletadas no beforeDelete (quando as linhas ainda existem) e
// limpas no afterDelete. Chave = id do usuário; a entrada vive só durante a
// requisição de exclusão.
const pendingCleanup = new Map<string, UserAssets>()

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        schema,
        provider: "pg"
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        // Excluir conta (Usuário > Excluir conta). O cliente sempre envia a senha
        // (authClient.deleteUser({ password })), que o better-auth confere. As
        // linhas do banco são apagadas pelo ON DELETE CASCADE; imagens do Blob e
        // salas no Redis são limpas pelos hooks abaixo.
        deleteUser: {
            enabled: true,
            beforeDelete: async (user) => {
                pendingCleanup.set(user.id, await collectUserAssets(user.id))
            },
            afterDelete: async (user) => {
                try {
                    await purgeUserAssets(pendingCleanup.get(user.id))
                } finally {
                    pendingCleanup.delete(user.id)
                }
            },
        },
    },
})
