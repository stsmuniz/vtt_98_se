import { MAX_STATUS_NAME_LENGTH, STATUS_COLOR_RE } from '../../lib/tokenStatuses'

/** Valida o corpo JSON de um status personalizado ({ name, color }); lança 400 se inválido. */
export function sanitizeStatusBody(body: unknown): { name: string; color: string } {
    if (!body || typeof body !== 'object') {
        throw createError({ statusCode: 400, statusMessage: 'Nenhum dado enviado.' })
    }
    const { name: rawName, color: rawColor } = body as Record<string, unknown>
    const name = typeof rawName === 'string' ? rawName.trim() : ''
    if (!name) {
        throw createError({ statusCode: 400, statusMessage: 'O nome não pode ficar vazio.' })
    }
    if (name.length > MAX_STATUS_NAME_LENGTH) {
        throw createError({ statusCode: 400, statusMessage: `O nome pode ter no máximo ${MAX_STATUS_NAME_LENGTH} caracteres.` })
    }
    if (typeof rawColor !== 'string' || !STATUS_COLOR_RE.test(rawColor)) {
        throw createError({ statusCode: 400, statusMessage: 'Cor inválida.' })
    }
    return { name, color: rawColor.toLowerCase() }
}
