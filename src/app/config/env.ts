import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

// Load variables from a local .env file (no-op in environments that inject
// variables directly, e.g. Render).
loadEnv();

/**
 * Environment schema.
 *
 * Only the variables required to run the foundation are mandatory. Secrets for
 * later phases (JWT, Google OAuth, SSLCommerz, Redis) are optional here and
 * will be tightened as those modules are implemented.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Comma-separated origins; parsed into an array below.
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  // ---- Placeholders for later phases (optional during foundation) ----
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().optional(),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  SSL_STORE_ID: z.string().optional(),
  SSL_STORE_PASSWORD: z.string().optional(),
  SSL_IS_LIVE: z.coerce.boolean().default(false),

  REDIS_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast: never start with an invalid configuration.
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  process.exit(1);
}

const data = parsed.data;

export const env = {
  ...data,
  isProduction: data.NODE_ENV === 'production',
  isDevelopment: data.NODE_ENV === 'development',
  isTest: data.NODE_ENV === 'test',
  corsOrigins: data.CORS_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;

export type Env = typeof env;
