// Swappable SMS/OTP provider. Real implementations (MSG91, 2Factor) just
// need to fill in sendOtp/verifySupportsServerSide below and be registered
// in getOtpProvider() — no call sites elsewhere change.
export interface OtpProvider {
  sendOtp(phoneNumber: string, otp: string): Promise<void>;
  /**
   * true if this provider verifies the OTP itself (e.g. 2Factor's hosted
   * verify API) — false if EasySociety stores+compares the OTP itself
   * (e.g. plain SMS send via MSG91, or the mock provider).
   */
  readonly verifiesServerSide: boolean;
}
