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

/**
 * Origens que podem chamar /api/auth/* (o better-auth responde 403 "Invalid origin" às demais).
 * Sem isso só a origem de BETTER_AUTH_URL funcionava: entrar por vtt98se.com.br falhava enquanto o
 * endereço *.vercel.app (o da env) funcionava. Entram: o domínio de produção, as URLs que a própria
 * Vercel injeta em cada deploy (produção, branch e deploy específico) e, opcionalmente,
 * BETTER_AUTH_TRUSTED_ORIGINS (lista separada por vírgula, ex.: um domínio novo).
 */
const PRODUCTION_ORIGINS = ['https://vtt98se.com.br', 'https://www.vtt98se.com.br']

function trustedOrigins(): string[] {
    const asOrigin = (value?: string) => {
        if (!value) return null
        const url = value.trim()
        return /^https?:\/\//.test(url) ? url.replace(/\/+$/, '') : `https://${url}`
    }
    const fromEnv = (process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? '').split(',')
    const candidates = [
        process.env.BETTER_AUTH_URL,
        ...PRODUCTION_ORIGINS,
        process.env.VERCEL_URL,
        process.env.VERCEL_BRANCH_URL,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
        ...fromEnv,
    ]
    return [...new Set(candidates.map(asOrigin).filter((o): o is string => Boolean(o)))]
}

export const auth = betterAuth({
    trustedOrigins: trustedOrigins(),
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
