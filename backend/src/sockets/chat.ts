import { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { verifyAuthToken } from '../middleware/auth';
import { pool } from '../db/pool';
import { assertMember, isMuted, persistMessage } from '../modules/chat/service';
import { isVisitorOf } from '../utils/visitorTag';

interface AuthedSocket extends Socket {
  userId?: string;
}

const sendMessageSchema = z.object({
  group_id: z.string().uuid(),
  message_type: z.enum(['text', 'image', 'voice']),
  content: z.string().max(4000).nullable(),
  reply_to_message_id: z.string().uuid().nullable().optional(),
});

// Registers the /chat Socket.io namespace. The server itself attaches the
// Redis adapter (see server.ts) so this fan-out works correctly across many
// horizontally-scaled Node instances behind the load balancer — a message
// emitted from the instance handling sender A reaches the instance holding
// recipient B's socket via Redis pub/sub, not via in-process EventEmitter.
export function registerChatNamespace(io: Server) {
  const chatNs = io.of('/chat');

  chatNs.use((socket: AuthedSocket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return next(new Error('Missing auth token'));
    try {
      const payload = verifyAuthToken(token);
      socket.userId = payload.userId;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  chatNs.on('connection', (socket: AuthedSocket) => {
    socket.on('group:join', async (groupId: string, ack?: (err?: string) => void) => {
      try {
        const id = z.string().uuid().parse(groupId);
        await assertMember(id, socket.userId!);
        await socket.join(roomName(id));
        ack?.();
      } catch (err) {
        ack?.((err as Error).message);
      }
    });

    socket.on('group:leave', (groupId: string) => {
      socket.leave(roomName(groupId));
    });

    socket.on('typing', ({ group_id, is_typing }: { group_id: string; is_typing: boolean }) => {
      socket.to(roomName(group_id)).emit('typing', { user_id: socket.userId, is_typing });
    });

    socket.on('message:send', async (raw, ack?: (err?: string, message?: unknown) => void) => {
      try {
        const input = sendMessageSchema.parse(raw);
        await assertMember(input.group_id, socket.userId!);

        if (await isMuted(input.group_id, socket.userId!)) {
          throw new Error('You have muted this group');
        }

        const message = await persistMessage({
          groupId: input.group_id,
          senderUserId: socket.userId!,
          messageType: input.message_type,
          content: input.content,
          replyToMessageId: input.reply_to_message_id ?? null,
        });

        const group = await pool.query('SELECT location_id FROM chat_groups WHERE id = $1', [input.group_id]);
        const sender = await pool.query('SELECT location_id FROM users WHERE id = $1', [socket.userId]);
        const isVisitor = isVisitorOf(group.rows[0]?.location_id ?? null, sender.rows[0]?.location_id ?? null);

        const payload = {
          ...message,
          is_visitor: isVisitor,
        };

        chatNs.to(roomName(input.group_id)).emit('message:new', payload);
        ack?.(undefined, payload);
      } catch (err) {
        ack?.((err as Error).message);
      }
    });
  });

  return chatNs;
}

function roomName(groupId: string) {
  return `group:${groupId}`;
}
