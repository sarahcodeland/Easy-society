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

  storageProvider: (process.env.STORAGE_PROVIDER ?? 'supabase') as 'supabase',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'easysociety-media',

  fcmProjectId: process.env.FCM_PROJECT_ID ?? '',
  fcmClientEmail: process.env.FCM_CLIENT_EMAIL ?? '',
  fcmPrivateKey: process.env.FCM_PRIVATE_KEY ?? '',

  openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? '',

  googleMyBusinessClientId: process.env.GOOGLE_MY_BUSINESS_CLIENT_ID ?? '',
  googleMyBusinessClientSecret: process.env.GOOGLE_MY_BUSINESS_CLIENT_SECRET ?? '',
  googleMyBusinessRedirectUri: process.env.GOOGLE_MY_BUSINESS_REDIRECT_URI ?? '',
};
