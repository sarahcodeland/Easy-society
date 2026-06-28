import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/routes';
import userRoutes from './modules/users/routes';
import locationRoutes from './modules/locations/routes';
import chatRoutes from './modules/chat/routes';
import qaRoutes from './modules/qa/routes';
import statusRoutes from './modules/statuses/routes';
import marketplaceRoutes from './modules/marketplace/routes';
import businessRoutes from './modules/businesses/routes';
import announcementRoutes from './modules/announcements/routes';
import notificationRoutes from './modules/notifications/routes';
import schemeRoutes from './modules/schemes/routes';
import moderationRoutes from './modules/moderation/routes';
import weatherRoutes from './modules/weather/routes';
import storageRoutes from './modules/storage/routes';
import communityRoutes from './modules/community/routes';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

  app.use('/auth', authRoutes);
  app.use('/users', userRoutes);
  app.use('/locations', locationRoutes);
  app.use('/chat', chatRoutes);
  app.use('/qa', qaRoutes);
  app.use('/statuses', statusRoutes);
  app.use('/marketplace', marketplaceRoutes);
  app.use('/businesses', businessRoutes);
  app.use('/announcements', announcementRoutes);
  app.use('/notifications', notificationRoutes);
  app.use('/schemes', schemeRoutes);
  app.use('/moderation', moderationRoutes);
  app.use('/weather', weatherRoutes);
  app.use('/storage', storageRoutes);
  app.use('/community', communityRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
