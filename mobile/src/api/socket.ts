import { io, Socket } from 'socket.io-client';
import { SOCKET_BASE_URL } from '../config';

let chatSocket: Socket | null = null;

// Lazily created, reused across the whole chat module — re-created only on
// logout (token changes). Avoids each chat screen opening its own
// connection, which would otherwise multiply server-side connection count
// for no benefit.
export function getChatSocket(token: string): Socket {
  if (chatSocket && chatSocket.connected && (chatSocket.auth as { token: string }).token === token) {
    return chatSocket;
  }
  chatSocket?.disconnect();
  chatSocket = io(`${SOCKET_BASE_URL}/chat`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });
  return chatSocket;
}

export function disconnectChatSocket(): void {
  chatSocket?.disconnect();
  chatSocket = null;
}
