import { PushMessage, PushProvider } from './PushProvider';

export class MockPushProvider implements PushProvider {
  async sendToTokens(tokens: string[], message: PushMessage): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[MockPushProvider] -> ${tokens.length} device(s):`, message.title, message.body);
  }
}
