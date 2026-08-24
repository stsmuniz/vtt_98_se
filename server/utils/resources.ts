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