import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createApp } from './app';
import { env } from './config/env';
import { redisPub, redisSub } from './config/redis';
import { registerChatNamespace } from './sockets/chat';

const app = createApp();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: '*' },
  // Redis adapter is what makes Socket.io horizontally scalable: without it,
  // a message sent by a client connected to instance A would never reach a
  // client connected to instance B. Required at this app's target scale
  // (50k-1M concurrent users across many Node instances behind an AWS ALB).
  adapter: createAdapter(redisPub, redisSub),
});

registerChatNamespace(io);

httpServer.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`EasySociety API listening on :${env.port} (${env.nodeEnv})`);
});

// Safety net: a stray rejected promise (e.g. the Socket.io Redis adapter
// giving up on a command while Redis is unreachable) must not take the whole
// API down — Node 15+ exits on unhandled rejections by default.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection', reason);
});

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0));
});
