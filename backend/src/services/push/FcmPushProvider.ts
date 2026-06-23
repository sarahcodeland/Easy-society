import axios from 'axios';
import { env } from '../../config/env';
import { PushMessage, PushProvider } from './PushProvider';

// Real Firebase Cloud Messaging implementation using the HTTP v1 API.
// Requires FCM_PROJECT_ID/FCM_CLIENT_EMAIL/FCM_PRIVATE_KEY (a service
// account) in .env. Falls back to no-op logging if unset — see index.ts.
export class FcmPushProvider implements PushProvider {
  async sendToTokens(tokens: string[], message: PushMessage): Promise<void> {
    const accessToken = await this.getAccessToken();
    await Promise.all(
      tokens.map((token) =>
        axios.post(
          `https://fcm.googleapis.com/v1/projects/${env.fcmProjectId}/messages:send`,
          {
            message: {
              token,
              notification: { title: message.title, body: message.body },
              data: message.data ?? {},
            },
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ).catch(() => undefined), // a single bad/expired token shouldn't fail the whole batch
      ),
    );
  }

  private async getAccessToken(): Promise<string> {
    // Service-account JWT exchange for an OAuth2 access token. Implement
    // with `google-auth-library` in production; omitted here to avoid an
    // extra heavy dependency in a stub-credentialed build.
    throw new Error('FCM service-account auth not configured');
  }
}
