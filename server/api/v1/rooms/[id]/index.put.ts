import { tables } from "#server/utils/drizzle.ts";
import { hashSync } from "bcrypt-ts";

export default defineEventHandler((event) => {
    return updateUploadableResource(event, {
        table: tables.roomsTable,
        fields: [
            { name: 'name', type: 'string' },
            { name: 'isOpen', type: 'boolean' },
            { name: 'tags', type: 'json' },
        ],
        // password is intentionally excluded from `fields`: it's only sent when the user
        // actually wants to change it, so it must not be coerced (which would blank it out
        // via `raw ?? ''`) and must be hashed before storage, unlike a plain string field.
        transformUpdate: (updateData, rawFields) => {
            if (rawFields.password) {
                updateData.password = hashSync(rawFields.password)
            }
        },
    })
})
