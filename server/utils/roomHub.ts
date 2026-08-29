import type { Peer } from 'crossws'

// Registro em memória (processo único) de peers WebSocket inscritos em cada sala,
// usado para replicar mudanças feitas pelo dono da sala para os visitantes conectados.
const peersByRoomCode = new Map<string, Set<Peer>>()

// Último snapshot transmitido ao vivo (arrastar/redimensionar/adicionar/remover token) que
// ainda não foi salvo no banco — permite que um peer que acabou de conectar (ou reconectar)
// veja o estado atual da sala em vez do último estado salvo, que pode estar desatualizado.
const liveSnapshotByRoomCode = new Map<string, unknown>()

export function addRoomPeer(code: string, peer: Peer) {
    let peers = peersByRoomCode.get(code)
    if (!peers) {
        peers = new Set()
        peersByRoomCode.set(code, peers)
    }
    peers.add(peer)
}

export function removeRoomPeer(code: string, peer: Peer) {
    const peers = peersByRoomCode.get(code)
    if (!peers) return
    peers.delete(peer)
    if (peers.size === 0) peersByRoomCode.delete(code)
}

export function getRoomLiveSnapshot(code: string): unknown {
    return liveSnapshotByRoomCode.get(code)
}

export function setRoomLiveSnapshot(code: string, snapshot: unknown) {
    liveSnapshotByRoomCode.set(code, snapshot)
}

export function clearRoomLiveSnapshot(code: string) {
    liveSnapshotByRoomCode.delete(code)
}

export function broadcastSnapshotLive(code: string, snapshot: unknown, sender?: Peer) {
    const peers = peersByRoomCode.get(code)
    if (!peers || peers.size === 0) return
    const data = JSON.stringify({ type: 'snapshot:live', snapshot })
    for (const peer of peers) {
        if (peer === sender) continue
        peer.send(data)
    }
}

export function broadcastRoomUpdate(code: string, room: unknown) {
    // A partir daqui o banco é a fonte da verdade novamente — descarta qualquer
    // rascunho ao vivo (não salvo) que existia antes deste save.
    clearRoomLiveSnapshot(code)
    broadcastToRoom(code, { type: 'room:update', room })
}

export function broadcastRoomClosed(code: string) {
    clearRoomLiveSnapshot(code)
    const peers = peersByRoomCode.get(code)
    if (!peers || peers.size === 0) return
    broadcastToRoom(code, { type: 'room:closed' })
    for (const peer of peers) peer.close(4000, 'Sala encerrada.')
    peersByRoomCode.delete(code)
}

function broadcastToRoom(code: string, message: unknown) {
    const peers = peersByRoomCode.get(code)
    if (!peers || peers.size === 0) return
    const data = JSON.stringify(message)
    for (const peer of peers) peer.send(data)
}
