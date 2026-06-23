import { env } from '../../config/env';
import { GoogleMyBusinessProvider } from './GoogleMyBusinessProvider';
import { StubGoogleMyBusinessProvider } from './StubGoogleMyBusinessProvider';

let instance: GoogleMyBusinessProvider | null = null;

export function getGoogleMyBusinessProvider(): GoogleMyBusinessProvider {
  if (instance) return instance;
  // Real provider requires completed Google OAuth app verification; until
  // GOOGLE_MY_BUSINESS_CLIENT_ID is configured, always use the stub.
  instance = env.googleMyBusinessClientId
    ? new StubGoogleMyBusinessProvider() // TODO: swap for RealGoogleMyBusinessProvider once credentials + OAuth flow are live
    : new StubGoogleMyBusinessProvider();
  return instance;
}

export * from './GoogleMyBusinessProvider';
