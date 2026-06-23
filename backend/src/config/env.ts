import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),

  databaseUrl: required('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/easysociety'),
  redisUrl: required('REDIS_URL', 'redis://localhost:6379'),

  jwtSecret: required('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',

  otpProvider: (process.env.OTP_PROVIDER ?? 'mock') as 'mock' | 'msg91' | '2factor',
  msg91ApiKey: process.env.MSG91_API_KEY ?? '',
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID ?? '',
  twoFactorApiKey: process.env.TWOFACTOR_API_KEY ?? '',

  storageProvider: (process.env.STORAGE_PROVIDER ?? 's3') as 's3' | 'r2',
  s3Bucket: process.env.S3_BUCKET ?? 'easysociety-media',
  s3Region: process.env.S3_REGION ?? 'ap-south-1',
  s3AccessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
  s3SecretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  r2Endpoint: process.env.R2_ENDPOINT ?? '',
  cdnBaseUrl: process.env.CDN_BASE_URL ?? '',

  fcmProjectId: process.env.FCM_PROJECT_ID ?? '',
  fcmClientEmail: process.env.FCM_CLIENT_EMAIL ?? '',
  fcmPrivateKey: process.env.FCM_PRIVATE_KEY ?? '',

  openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? '',

  googleMyBusinessClientId: process.env.GOOGLE_MY_BUSINESS_CLIENT_ID ?? '',
  googleMyBusinessClientSecret: process.env.GOOGLE_MY_BUSINESS_CLIENT_SECRET ?? '',
  googleMyBusinessRedirectUri: process.env.GOOGLE_MY_BUSINESS_REDIRECT_URI ?? '',
};
