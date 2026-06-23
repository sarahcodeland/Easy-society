import axios from 'axios';
import { env } from '../../config/env';
import { OtpProvider } from './OtpProvider';

// Fill in MSG91_API_KEY / MSG91_TEMPLATE_ID in .env to activate. Uses
// MSG91's plain SMS send API with EasySociety generating/storing/comparing
// the OTP itself (same contract as MockOtpProvider).
export class Msg91OtpProvider implements OtpProvider {
  readonly verifiesServerSide = false;

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    await axios.post(
      'https://control.msg91.com/api/v5/otp',
      { mobile: phoneNumber, otp, template_id: env.msg91TemplateId },
      { headers: { authkey: env.msg91ApiKey } },
    );
  }
}
