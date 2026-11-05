import { del } from '@vercel/blob'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import * as schema from '../db/schema'

/**
 * Limpeza do que fica FORA do banco quando um usuário exclui a conta.
 *
 * As linhas do banco somem sozinhas: toda FK para `user` é `ON DELETE CASCADE`
 * (tokens, cenários, cenas, salas, sessões, preferências). Mas o banco não sabe
 * das imagens no Vercel Blob nem do estado das salas no Redis, então:
 *
 * 1. `collectUserAssets` (no `beforeDelete`, enquanto as linhas ainda existem)
 *    junta as URLs de imagem do usuário e os códigos das salas dele.
 * 2. `purgeUserAssets` (no `afterDelete`) apaga essas imagens do Blob e avisa
 *    os visitantes das salas que elas foram fechadas.
 *
 * Falhas aqui são só registradas em log: a conta já foi excluída e o usuário não
 * deve ver erro por causa de um arquivo órfão.
 */

export interface UserAssets {
    imageUrls: string[]
    roomCodes: string[]
}

const BLOB_DELETE_BATCH = 100

/** Só imagens que nós mesmos subimos para o Vercel Blob (as antigas em /public ficam de fora). */
function isOwnBlobUrl(url: unknown): url is string {
    if (typeof url !== 'string') return false
    try {
        return new URL(url).hostname.endsWith('.blob.vercel-storage.com')
    } catch {
        return false
    }
}

export async function collectUserAssets(userId: string): Promise<UserAssets> {
    const db = useDrizzle()
    const { tokensTable, scenariosTable, scenesTable, roomsTable } = schema

    const [tokens, scenarios, scenes, rooms] = await Promise.all([
        db.select({ image: tokensTable.image }).from(tokensTable).where(eq(tokensTable.userId, userId)),
        db.select({ image: scenariosTable.image }).from(scenariosTable).where(eq(scenariosTable.userId, userId)),
        db.select({ tokens: scenesTable.tokens }).from(scenesTable).where(eq(scenesTable.userId, userId)),
        db.select({ code: roomsTable.code, snapshot: roomsTable.snapshot }).from(roomsTable).where(eq(roomsTable.userId, userId)),
    ])

    const candidates = new Set<string>()
    const add = (url: unknown) => { if (isOwnBlobUrl(url)) candidates.add(url) }
    tokens.forEach(t => add(t.image))
    scenarios.forEach(s => add(s.image))
    scenes.forEach(s => s.tokens?.forEach(t => add(t.image)))
    rooms.forEach(r => r.snapshot?.tokens?.forEach(t => add(t.image)))

    // Uma imagem só pode ser apagada se ninguém mais a usa. Isso não deveria
    // acontecer (duplicar reaproveita a URL só dentro do mesmo usuário), mas o
    // snapshot de uma sala guarda tokens com `userId` próprio — melhor não arriscar
    // apagar a imagem de outra pessoa.
    const urls = [...candidates]
    const sharedUrls = urls.length ? await findUrlsUsedByOthers(userId, urls) : new Set<string>()

    return {
        imageUrls: urls.filter(u => !sharedUrls.has(u)),
        roomCodes: rooms.map(r => r.code),
    }
}

async function findUrlsUsedByOthers(userId: string, urls: string[]): Promise<Set<string>> {
    const db = useDrizzle()
    const { tokensTable, scenariosTable } = schema
    const imageInUrls = inArray(sql`t->>'image'`, urls)

    const [tokens, scenarios, sceneTokens, roomTokens] = await Promise.all([
        db.select({ url: tokensTable.image }).from(tokensTable)
            .where(and(ne(tokensTable.userId, userId), inArray(tokensTable.image, urls))),
        db.select({ url: scenariosTable.image }).from(scenariosTable)
            .where(and(ne(scenariosTable.userId, userId), inArray(scenariosTable.image, urls))),
        db.execute<{ url: string }>(sql`
            select distinct t->>'image' as url
            from scenes s
            cross join lateral jsonb_array_elements(coalesce(s.tokens, '[]'::jsonb)) t
            where s.user_id <> ${userId} and ${imageInUrls}`),
        db.execute<{ url: string }>(sql`
            select distinct t->>'image' as url
            from rooms r
            cross join lateral jsonb_array_elements(coalesce(r.snapshot->'tokens', '[]'::jsonb)) t
            where r.user_id <> ${userId} and ${imageInUrls}`),
    ])

    return new Set([...tokens, ...scenarios, ...sceneTokens, ...roomTokens].map(r => r.url))
}

export async function purgeUserAssets(assets: UserAssets | undefined) {
    if (!assets) return

    for (let i = 0; i < assets.imageUrls.length; i += BLOB_DELETE_BATCH) {
        const batch = assets.imageUrls.slice(i, i + BLOB_DELETE_BATCH)
        try {
            await del(batch)
        } catch (error) {
            console.error('[conta] falha ao apagar imagens do Blob', { count: batch.length, error })
        }
    }

    await Promise.all(assets.roomCodes.map(async (code) => {
        try {
            await broadcastRoomClosed(code)
        } catch (error) {
            console.error('[conta] falha ao fechar sala no Redis', { code, error })
        }
    }))
}
