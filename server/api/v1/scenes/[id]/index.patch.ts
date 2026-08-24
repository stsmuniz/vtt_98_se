import {createError} from "h3";
import {eq} from "drizzle-orm";
import {scenesTable} from "#server/db/schema.ts";


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

    const body = await readBody<Partial<Scene>>(event)

    const db = useDrizzle()
    const [scene]  = await db
        .update(tables.scenesTable)
        .set(body)
        .where(eq(tables.scenesTable.id, id))
        .returning({id: scenesTable.id})

    if (!scene) {
        throw createError({
            statusCode: 404,
            statusMessage: "Cena não encontrada.",
        })
    }

    return await db.query.scenesTable.findFirst({
        where: eq(scenesTable.id, scene.id),
        with: {
            scenario: true
        }
    })
})