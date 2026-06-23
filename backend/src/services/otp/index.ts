import { env } from '../../config/env';
import { OtpProvider } from './OtpProvider';
import { MockOtpProvider } from './MockOtpProvider';
import { Msg91OtpProvider } from './Msg91OtpProvider';
import { TwoFactorOtpProvider } from './TwoFactorOtpProvider';

let instance: OtpProvider | null = null;

export function getOtpProvider(): OtpProvider {
  if (instance) return instance;
  switch (env.otpProvider) {
    case 'msg91':
      instance = new Msg91OtpProvider();
      break;
    case '2factor':
      instance = new TwoFactorOtpProvider();
      break;
    default:
      instance = new MockOtpProvider();
  }
  return instance;
}

export * from './OtpProvider';
