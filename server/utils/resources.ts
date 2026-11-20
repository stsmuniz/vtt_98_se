import type { SceneToken, RoomToken, RoomSceneSnapshot, SceneAttribute, SceneDrawing } from "#server/db/schema.ts"
import { barFraction } from "../../lib/tokenBars"

export interface SceneResourceResponse {
    id: number;
    name: string;
    width: number;
    height: number;
    image?: string;
    startingPosition: {x: number, y: number},
    tokens: Token[],
    drawings: SceneDrawing[],
    scenario: Scenario,
    tags: string[]
}

export const sceneResource = (scene: any): SceneResourceResponse => {
    return {
        id: scene.scenes.id,
        name: scene.scenes.name,
        width: scene.scenes.width,
        height: scene.scenes.height,
        image: scene.scenarios.image,
        startingPosition: scene.scenes.startingPosition,
        tokens: scene.scenes.tokens,
        drawings: scene.scenes.drawings ?? [],
        scenario: scene.scenarios,
        tags: scene.scenes.tags,
    }
}

export const sceneResourceCollection = (scenes: any[]): SceneResourceResponse[] => scenes.map(sceneResource)

/**
 * Clones a scene's tokens into a room's live-play state: adds an empty `statuses` list and, per attribute,
 * `visibility`/`currentValue` (seeded from the attribute's base `value`). Used both when a
 * room is created from a scene and when a GM switches a room to a different scene mid-session.
 */
/**
 * Strips the (hashed) password before a room is sent to WebSocket peers, which include
 * unauthenticated visitors — unlike the owner-only HTTP responses, this must never leak it.
 */
export function publicRoomResource(room: Record<string, unknown>) {
    const { password, ...rest } = room
    // O hash nunca sai do servidor, mas o cliente precisa saber se a sala tem senha.
    return { ...rest, hasPassword: !!password }
}

// ---- Visão de jogador ----
// O que vai para quem NÃO é o dono da sala (/join e a stream de eventos). O mestre recebe tudo;
// os jogadores só o que a tela deles usa — o resto (atributos ocultos, cena de origem, id do
// dono) ficaria à vista de qualquer um no devtools.

/** Escala usada para mandar só a proporção de uma barra sem números (ver `playerAttribute`). */
const BAR_SCALE = 1000

/**
 * Atributo como o jogador o vê:
 * - sem barra (`showBar` falso = "Oculto" na janela do token): vira um marcador vazio — mantém
 *   a posição na lista, de que depende a cor padrão das barras seguintes (`defaultBarColor(index)`);
 * - barra sem números (`showBarValues` falso): só o nome e a proporção, em escala 0..BAR_SCALE,
 *   em vez dos valores reais (a barra não mostra números, e o JSON também não deve mostrar).
 */
function playerAttribute(attribute: SceneAttribute): SceneAttribute {
    if (!attribute?.showBar) return { name: '', value: '', showBar: false }
    if (attribute.showBarValues) return attribute

    const fraction = barFraction(attribute)
    return {
        name: attribute.name,
        value: '',
        currentValue: fraction === null ? '' : String(Math.round(fraction * BAR_SCALE)),
        maxValue: fraction === null ? '' : String(BAR_SCALE),
        showBar: true,
        showBarValues: false,
        ...(attribute.barColor ? { barColor: attribute.barColor } : {}),
        ...(attribute.visibility ? { visibility: attribute.visibility } : {}),
    }
}

/** Snapshot da sala (salvo ou ao vivo) sem os atributos que o jogador não deve ver. */
export function playerSnapshot<T>(snapshot: T): T {
    const value = snapshot as unknown as RoomSceneSnapshot | null | undefined
    if (!value || typeof value !== 'object' || !Array.isArray(value.tokens)) return snapshot
    return {
        ...value,
        tokens: value.tokens.map(token => (token && Array.isArray(token.attributes)
            ? { ...token, attributes: token.attributes.map(playerAttribute) }
            : token)),
    } as unknown as T
}

/**
 * Sala como o jogador a vê: sem a senha (só `hasPassword`), sem o `userId` do dono, com o
 * snapshot filtrado e a cena de origem reduzida à imagem do cenário (o único campo que a página
 * da sala lê dela). Só mexe nas chaves presentes — um `room:update` parcial (ex.: o PUT, que não
 * carrega `sourceScene`) não pode apagar no cliente o que não veio.
 */
export function playerRoomResource(room: Record<string, unknown>) {
    const { password, userId: _userId, sourceScene, snapshot, ...rest } = room
    const result: Record<string, unknown> = { ...rest }
    if ('password' in room) result.hasPassword = !!password
    else if ('hasPassword' in room) result.hasPassword = room.hasPassword
    if ('snapshot' in room) result.snapshot = playerSnapshot(snapshot)
    if ('sourceScene' in room) {
        const image = (sourceScene as { scenario?: { image?: string } } | null)?.scenario?.image
        result.sourceScene = image ? { scenario: { image } } : null
    }
    return result
}

/**
 * Versão de uma mensagem da stream de eventos para um jogador: `room:update` e `snapshot:live`
 * passam pelos filtros acima; as demais seguem iguais.
 */
export function playerRoomMessage(message: unknown): unknown {
    const value = message as { type?: string, room?: unknown, snapshot?: unknown } | null
    if (value?.type === 'room:update' && value.room && typeof value.room === 'object') {
        return { ...value, room: playerRoomResource(value.room as Record<string, unknown>) }
    }
    if (value?.type === 'snapshot:live' && value.snapshot) {
        return { ...value, snapshot: playerSnapshot(value.snapshot) }
    }
    return message
}

export function buildRoomSnapshotFromScene(scene: {
    id: number
    width: number
    height: number
    startingPosition?: { x: number; y: number } | null
    tokens?: SceneToken[] | null
    drawings?: SceneDrawing[] | null
}): RoomSceneSnapshot {
    return {
        sceneId: scene.id,
        width: scene.width,
        height: scene.height,
        startingPosition: scene.startingPosition ?? null,
        drawings: scene.drawings ?? [],
        tokens: (scene.tokens ?? []).map((token): RoomToken => ({
            ...token,
            statuses: [],
            attributes: (token.attributes ?? []).map((attribute): SceneAttribute => ({
                ...attribute,
                visibility: 'visible',
                currentValue: attribute.value,
            })),
        })),
    }
}