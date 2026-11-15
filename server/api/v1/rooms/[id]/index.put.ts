import { tables } from "#server/utils/drizzle.ts";
import { publicRoomResource } from "#server/utils/resources.ts";

export default defineEventHandler(async (event) => {
    let passwordChanged = false
    const room = await updateUploadableResource(event, {
        table: tables.roomsTable,
        fields: [
            { name: 'isOpen', type: 'boolean' },
            { name: 'tags', type: 'json' },
        ],
        // password is intentionally excluded from `fields`: it's only sent when the user
        // actually wants to change it, so it must not be coerced (which would blank it out
        // via `raw ?? ''`) and must be hashed before storage, unlike a plain string field.
        transformUpdate: async (updateData, rawFields) => {
            if (rawFields.password) {
                updateData.password = await hashRoomPassword(rawFields.password)
                passwordChanged = true
            }
        },
    })

    // Senha trocada: quem está conectado segue na sala; os tokens de quem não está deixam de valer.
    if (passwordChanged) await broadcastAccessChanged(room.code, roomAccessTag(room.password))
    const resource = publicRoomResource(room)
    await broadcastRoomUpdate(room.code, resource)

    // Nunca devolve o hash da senha, nem ao dono (só `hasPassword`).
    return resource
})
