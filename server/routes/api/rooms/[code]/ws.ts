import { compareSync } from 'bcrypt-ts'
import { eq } from 'drizzle-orm'
import { roomsTable } from '#server/db/schema.ts'

// Sala fica aberta por até este tempo aguardando a mensagem de autenticação antes de
// ser fechada, caso a sala exija senha e o peer não seja o dono.
const AUTH_TIMEOUT_MS = 10_000

function getRoomCodeFromPeer(peer: any): string | null {
    try {
        const url = new URL(peer.request.url, 'http://localhost')
        const match = url.pathname.match(/\/api\/rooms\/([^/]+)\/ws\/?$/)
        return match ? decodeURIComponent(match[1]) : null
    } catch {
        return null
    }
}

// Envia ao peer o rascunho ao vivo da sala (mudanças de token ainda não salvas pelo dono),
// caso exista, para que ele não fique preso no último estado salvo até a próxima edição.
async function sendCurrentLiveSnapshot(peer: any, code: string) {
    const liveSnapshot = await getRoomLiveSnapshot(code)
    if (liveSnapshot) {
        peer.send(JSON.stringify({ type: 'snapshot:live', snapshot: liveSnapshot }))
    }
}

// Replica, em tempo real, as mudanças feitas pelo dono da sala (tokens, cena, estado da sala)
// para os visitantes conectados. A senha nunca trafega pela URL (evita logs) — quando a sala
// exige senha, o cliente a envia como primeira mensagem após a conexão ser aberta.
//
// Edições de token (arrastar, redimensionar, duplicar, remover, atributos) são transmitidas
// ao vivo via `snapshot:live` sem tocar no banco de dados — só são persistidas quando o dono
// salva a sala (o que dispara um `room:update` a partir do endpoint PATCH/PUT).
export default defineWebSocketHandler({
    async open(peer) {
        const code = getRoomCodeFromPeer(peer)
        if (!code) {
            peer.close(4000, 'Sala inválida.')
            return
        }

        const room = await useDrizzle().query.roomsTable.findFirst({
            where: eq(roomsTable.code, code),
        })

        if (!room) {
            peer.close(4004, 'Sala não encontrada.')
            return
        }

        peer.context.roomCode = code

        const session = await auth.api.getSession({ headers: peer.request.headers }).catch(() => null)
        const isOwner = !!session?.user && session.user.id === room.userId
        peer.context.isOwner = isOwner

        if (!room.password || isOwner) {
            addRoomPeer(code, peer)
            await sendCurrentLiveSnapshot(peer, code)
            return
        }

        peer.context.pendingPasswordHash = room.password
        peer.context.authTimeout = setTimeout(() => {
            if (!peer.context.authorized) peer.close(4401, 'Não autenticado.')
        }, AUTH_TIMEOUT_MS)
    },

    async message(peer, message) {
        let data: any
        try {
            data = message.json()
        } catch {
            return
        }

        const passwordHash = peer.context.pendingPasswordHash as string | undefined
        if (passwordHash && !peer.context.authorized) {
            if (data?.type !== 'auth' || typeof data.password !== 'string' || !compareSync(data.password, passwordHash)) {
                peer.send(JSON.stringify({ type: 'error', message: 'Senha incorreta.' }))
                peer.close(4401, 'Não autenticado.')
                return
            }

            clearTimeout(peer.context.authTimeout as ReturnType<typeof setTimeout>)
            peer.context.authorized = true
            const code = peer.context.roomCode as string
            addRoomPeer(code, peer)
            await sendCurrentLiveSnapshot(peer, code)
            return
        }

        if (data?.type === 'snapshot:live' && peer.context.isOwner && data.snapshot) {
            const code = peer.context.roomCode as string
            await Promise.all([
                setRoomLiveSnapshot(code, data.snapshot),
                broadcastSnapshotLive(code, data.snapshot, peer),
            ])
        }
    },

    close(peer) {
        clearTimeout(peer.context.authTimeout as ReturnType<typeof setTimeout>)
        const code = peer.context.roomCode as string | undefined
        if (code) removeRoomPeer(code, peer)
    },

    error(peer) {
        clearTimeout(peer.context.authTimeout as ReturnType<typeof setTimeout>)
        const code = peer.context.roomCode as string | undefined
        if (code) removeRoomPeer(code, peer)
    },
})
