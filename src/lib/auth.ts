import { createHash, timingSafeEqual } from "node:crypto";

export const AUTH_COOKIE = "ds_access";
export const AUTH_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function authEnabled(): boolean {
  return Boolean(process.env.ACCESS_PASSWORD);
}

/**
 * Cookie value derived from the access password. Only a hash is stored in the
 * browser; changing the password invalidates every existing cookie.
 */
export function accessToken(): string {
  const password = process.env.ACCESS_PASSWORD ?? "";
  return createHash("sha256").update(`${password}|ds-access-v1`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.ACCESS_PASSWORD;
  if (!expected) return true;
  return safeEqual(input, expected);
}

export function isAuthedCookie(value: string | undefined): boolean {
  if (!authEnabled()) return true;
  if (!value) return false;
  return safeEqual(value, accessToken());
}
