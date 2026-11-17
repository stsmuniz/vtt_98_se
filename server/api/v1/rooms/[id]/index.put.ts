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
    // Editar a sala pela pasta não mexe nos tokens: o snapshot (último salvo) não vai no aviso ao
    // vivo, senão quem está na sala perderia o rascunho que o mestre ainda não salvou.
    const { snapshot: _snapshot, ...withoutSnapshot } = resource
    await broadcastRoomUpdate(room.code, withoutSnapshot)
    // Sala fechada: desconecta os jogadores que ainda estiverem nela (ver o PATCH).
    if (!room.isOpen) await broadcastRoomShut(room.code)

    // Nunca devolve o hash da senha, nem ao dono (só `hasPassword`).
    return resource
})
