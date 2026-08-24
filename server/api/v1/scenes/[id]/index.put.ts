import { tables } from "#server/utils/drizzle.ts";
import { createError } from 'h3';
import { eq } from "drizzle-orm";
import type {SceneToken} from "#server/db/schema.ts";


export default defineEventHandler(async (event) => {
    const session = await auth.api.getSession({
        headers: event.headers,
    })

    const idParam = getRouterParam(event, "id");
    const id = Number(idParam);

    if (!idParam || Number.isNaN(id)) {
        throw createError({
            statusCode: 400,
            statusMessage: "ID inválido.",
        });
    }

    const fields: Record<string, string> = {}

    const name = fields.name
    const width = Number(fields.width)
    const height = Number(fields.height)
    const tags = fields.tags ? JSON.parse(fields.tags) : []
    const startingPosition = fields.startingPosition ? JSON.parse(fields.startingPosition) : { x: 0, y: 0}
    const scenarioId = parseInt(fields.scenarioId)
    const tokens: SceneToken[] = fields.tokens ? JSON.parse(fields.tokens) : []

    const db = useDrizzle()

    const updateData = {
        name,
        width,
        height,
        tags,
        startingPosition,
        scenarioId,
        tokens,
        updatedAt: new Date(),
    };

    const insertResult = await db
        .update(tables.scenesTable)
        .set(updateData)
        .where(eq(tables.scenesTable.id, id));

    return insertResult
})
