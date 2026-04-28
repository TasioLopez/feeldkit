import { env } from "@/lib/config/env";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function hasAdminAllowlist(): boolean {
  return env.ADMIN_ALLOWED_EMAILS_LIST.length > 0 || env.ADMIN_ALLOWED_EMAIL_DOMAINS_LIST.length > 0;
}

export function isAdminEmailAllowed(email: string | null | undefined): boolean {
  if (!email) {
    return false;
  }

  if (!hasAdminAllowlist()) {
    return true;
  }

  const normalized = normalizeEmail(email);
  if (env.ADMIN_ALLOWED_EMAILS_LIST.includes(normalized)) {
    return true;
  }

  const domain = normalized.split("@")[1] ?? "";
  return Boolean(domain) && env.ADMIN_ALLOWED_EMAIL_DOMAINS_LIST.includes(domain);
}
