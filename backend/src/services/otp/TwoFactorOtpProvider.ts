import axios from 'axios';
import { env } from '../../config/env';
import { OtpProvider } from './OtpProvider';

// Fill in TWOFACTOR_API_KEY to activate. 2Factor's AUTOGEN endpoint also
// supports voice OTP delivery (?Voice=true query param) for the
// voice-OTP-reading requirement — toggle that in sendOtp once live.
export class TwoFactorOtpProvider implements OtpProvider {
  readonly verifiesServerSide = false;

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    await axios.get(
      `https://2factor.in/API/V1/${env.twoFactorApiKey}/SMS/${phoneNumber}/${otp}`,
    );
  }
}
