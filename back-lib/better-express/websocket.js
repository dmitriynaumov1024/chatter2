import { WebSocketServer } from "ws"

export function createWebSocket (server) {
    return new WebSocketServer({ server: server })
}
