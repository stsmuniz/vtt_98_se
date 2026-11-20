import { createError } from 'h3'
import { sanitizeDrawings, type SceneDrawing } from '../../lib/drawings'

/** Valida os desenhos de uma cena/sala vindos do cliente (ver lib/drawings.ts); 400 se inválidos. */
export function parseDrawings(value: unknown): SceneDrawing[] {
    try {
        return sanitizeDrawings(value)
    } catch (error) {
        throw createError({ statusCode: 400, statusMessage: (error as Error).message || 'Desenhos inválidos.' })
    }
}

/**
 * Snapshot de sala vindo do cliente: se trouxer `drawings`, troca pela versão validada. Snapshots
 * antigos (sem o campo) passam como estão.
 */
export function withParsedDrawings<T extends object>(snapshot: T): T {
    if (!('drawings' in snapshot)) return snapshot
    return { ...snapshot, drawings: parseDrawings((snapshot as { drawings?: unknown }).drawings) }
}
