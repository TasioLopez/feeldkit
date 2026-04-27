import { z } from "zod";

const boolish = (v: string | undefined) => v === "true" || v === "1";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  ADMIN_HOST: z.string().optional(),
  PUBLIC_API_HOST: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  /** If set, browser CORS to `/api/v1/*` is limited to this single origin (e.g. `https://app.example.com`). */
  FEELDKIT_API_CORS_ORIGIN: z.string().optional(),
});

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  ADMIN_HOST: process.env.ADMIN_HOST,
  PUBLIC_API_HOST: process.env.PUBLIC_API_HOST,
  SENTRY_DSN: process.env.SENTRY_DSN,
  FEELDKIT_API_CORS_ORIGIN: process.env.FEELDKIT_API_CORS_ORIGIN,
});

export const env = {
  ...parsed,
  NEXT_PUBLIC_SHOW_ADMIN_LINK: boolish(process.env.NEXT_PUBLIC_SHOW_ADMIN_LINK),
  ALLOW_DEMO_API_KEY: boolish(process.env.ALLOW_DEMO_API_KEY),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
