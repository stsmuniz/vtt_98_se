import type { SceneToken, RoomToken, RoomSceneSnapshot, SceneAttribute } from "#server/db/schema.ts"

export interface SceneResourceResponse {
    id: number;
    name: string;
    width: number;
    height: number;
    image?: string;
    startingPosition: {x: number, y: number},
    tokens: Token[],
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
        scenario: scene.scenarios,
        tags: scene.scenes.tags,
    }
}

export const sceneResourceCollection = (scenes: any[]): SceneResourceResponse[] => scenes.map(sceneResource)

/**
 * Clones a scene's tokens into a room's live-play state: adds `status` and, per attribute,
 * `visibility`/`currentValue` (seeded from the attribute's base `value`). Used both when a
 * room is created from a scene and when a GM switches a room to a different scene mid-session.
 */
export function buildRoomSnapshotFromScene(scene: {
    id: number
    width: number
    height: number
    startingPosition?: { x: number; y: number } | null
    tokens?: SceneToken[] | null
}): RoomSceneSnapshot {
    return {
        sceneId: scene.id,
        width: scene.width,
        height: scene.height,
        startingPosition: scene.startingPosition ?? null,
        tokens: (scene.tokens ?? []).map((token): RoomToken => ({
            ...token,
            status: 'normal',
            attributes: (token.attributes ?? []).map((attribute): SceneAttribute => ({
                ...attribute,
                visibility: 'visible',
                currentValue: attribute.value,
            })),
        })),
    }
}