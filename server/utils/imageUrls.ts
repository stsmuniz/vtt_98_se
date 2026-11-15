import { and, eq, inArray, or } from 'drizzle-orm'
import { createError } from 'h3'
import * as schema from '../db/schema'

// Quais URLs de imagem podem ser gravadas nos JSON de tokens (cena, sala, rascunho ao vivo).
//
// Os tokens de uma cena/sala chegam do cliente como JSON e são exibidos no navegador de todos
// os visitantes (inclusive anônimos). Sem conferir, o mestre poderia apontar `image` para
// qualquer endereço — fazendo o navegador de cada visitante buscar um servidor de terceiros
// (vazando IP e user agent) — ou para o Blob de outro usuário. Vale:
// - caminho relativo dos arquivos públicos antigos (`/tokens/`, `/scenarios/`, `/maps/`, `/assets/`);
// - arquivo do NOSSO store do Vercel Blob (o id do store vem do BLOB_READ_WRITE_TOKEN);
// - URL que já estava gravada naquela mesma cena/sala (dados antigos continuam salvando);
// - imagem de um token, documento ou cenário do próprio usuário (cobre uma troca de store).

const LEGACY_PREFIXES = ['/tokens/', '/scenarios/', '/maps/', '/assets/']

/** Host público do nosso store do Blob, ou `null` se não der para saber (aceita qualquer store). */
function ownBlobHost(): string | null {
    const id = (process.env.BLOB_READ_WRITE_TOKEN ?? '').match(/^vercel_blob_rw_([A-Za-z0-9]+)_/)?.[1]
    return id ? `${id.toLowerCase()}.public.blob.vercel-storage.com` : null
}

/** URL aceita sem consultar o banco: caminho público antigo ou arquivo do nosso Blob. */
export function isAllowedImageUrl(url: unknown): boolean {
    if (typeof url !== 'string' || !url) return false
    if (url.startsWith('/')) {
        return !url.startsWith('//') && !url.includes('..') && !url.includes('\\') && LEGACY_PREFIXES.some(prefix => url.startsWith(prefix))
    }
    try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:') return false
        const host = ownBlobHost()
        return host ? parsed.hostname === host : parsed.hostname.endsWith('.public.blob.vercel-storage.com')
    } catch {
        return false
    }
}

/** URLs de imagem (`image`, `fullImage`) de uma lista de tokens. */
export function tokenImageUrls(tokens: unknown): string[] {
    if (!Array.isArray(tokens)) return []
    const urls: string[] = []
    for (const token of tokens) {
        if (!token || typeof token !== 'object') continue
        const { image, fullImage } = token as { image?: unknown, fullImage?: unknown }
        if (typeof image === 'string' && image) urls.push(image)
        if (typeof fullImage === 'string' && fullImage) urls.push(fullImage)
    }
    return urls
}

/** Das `urls`, as que são imagem de um token, documento ou cenário do usuário. */
async function urlsOwnedByUser(userId: string, urls: string[]): Promise<Set<string>> {
    if (!urls.length) return new Set()
    const db = useDrizzle()
    const { tokensTable, documentsTable, scenariosTable } = schema
    const [tokens, documents, scenarios] = await Promise.all([
        db.select({ image: tokensTable.image }).from(tokensTable)
            .where(and(eq(tokensTable.userId, userId), inArray(tokensTable.image, urls))),
        db.select({ image: documentsTable.image, fullImage: documentsTable.fullImage }).from(documentsTable)
            .where(and(eq(documentsTable.userId, userId), or(inArray(documentsTable.image, urls), inArray(documentsTable.fullImage, urls)))),
        db.select({ image: scenariosTable.image }).from(scenariosTable)
            .where(and(eq(scenariosTable.userId, userId), inArray(scenariosTable.image, urls))),
    ])
    const owned = new Set<string>()
    tokens.forEach(t => owned.add(t.image))
    documents.forEach((d) => { owned.add(d.image); if (d.fullImage) owned.add(d.fullImage) })
    scenarios.forEach(s => owned.add(s.image))
    return owned
}

/**
 * Confere as imagens de `tokens` (lança 400 se alguma não for aceita). `previousTokens` são os
 * tokens já gravados naquela cena/sala: as URLs deles continuam valendo.
 */
export async function assertAllowedTokenImages(tokens: unknown, userId: string, previousTokens: unknown = []) {
    const known = new Set(tokenImageUrls(previousTokens))
    const pending = [...new Set(tokenImageUrls(tokens))].filter(url => !known.has(url) && !isAllowedImageUrl(url))
    if (!pending.length) return

    const owned = await urlsOwnedByUser(userId, pending)
    if (pending.some(url => !owned.has(url))) {
        throw createError({ statusCode: 400, statusMessage: 'Um dos tokens usa uma imagem que não pertence ao VTT 98 SE.' })
    }
}
