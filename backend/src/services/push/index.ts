import { env } from '../../config/env';
import { PushProvider } from './PushProvider';
import { FcmPushProvider } from './FcmPushProvider';
import { MockPushProvider } from './MockPushProvider';

let instance: PushProvider | null = null;

export function getPushProvider(): PushProvider {
  if (instance) return instance;
  instance = env.fcmProjectId ? new FcmPushProvider() : new MockPushProvider();
  return instance;
}

export * from './PushProvider';
