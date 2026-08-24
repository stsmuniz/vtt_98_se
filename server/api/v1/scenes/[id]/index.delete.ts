import { tables } from "#server/utils/drizzle.ts";
import { createError } from 'h3';
import {eq} from "drizzle-orm";

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

    const result = await useDrizzle()
        .delete(tables.scenariosTable)
        .where(eq(tables.scenariosTable.id, id))
        .returning()

    return result
})
