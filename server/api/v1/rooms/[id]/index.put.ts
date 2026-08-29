import { tables } from "#server/utils/drizzle.ts";
import { publicRoomResource } from "#server/utils/resources.ts";
import { hashSync } from "bcrypt-ts";

export default defineEventHandler(async (event) => {
    const room = await updateUploadableResource(event, {
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

    broadcastRoomUpdate(room.code, publicRoomResource(room))

    return room
})
