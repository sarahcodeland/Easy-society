import { OtpProvider } from './OtpProvider';

// Dev/test provider: logs the OTP instead of sending a real SMS. Fully
// functional for local development and CI — EasySociety still generates,
// stores (Redis, TTL), and compares the OTP itself, exactly as it would
// with a "send-only" real provider like MSG91.
export class MockOtpProvider implements OtpProvider {
  readonly verifiesServerSide = false;

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    // eslint-disable-next-line no-console
    console.log(`[MockOtpProvider] OTP for ${phoneNumber}: ${otp}`);
  }
}
