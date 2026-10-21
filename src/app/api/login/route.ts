import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_COOKIE,
  AUTH_MAX_AGE_SECONDS,
  accessToken,
  authEnabled,
  verifyPassword,
} from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";
import { checkRateLimit, getClientIp, readIntEnv } from "@/lib/rate-limit";

export const runtime = "nodejs";

function shouldUseSecureCookie(request: NextRequest): boolean {
  const override = process.env.COOKIE_SECURE;
  if (override === "0") return false;
  if (override === "1") return true;
  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  return forwardedProto === "https" || request.nextUrl.protocol === "https:";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = readIntEnv("LOGIN_RATE_LIMIT_PER_MINUTE", 5);
  const rate = checkRateLimit(`login:${ip}`, limit);

  if (!rate.ok) {
    return NextResponse.json(
      { error: { code: "RATE_LIMITED", message: "尝试次数过多，请稍后再试。" } },
      { status: 429, headers: { "Retry-After": String(rate.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "请求体不是合法的 JSON。" } },
      { status: 400 },
    );
  }

  const input = body as Record<string, unknown> | null;
  const password = typeof input?.password === "string" ? input.password : "";
  const next = safeNextPath(
    typeof input?.next === "string" ? input.next : undefined,
  );

  if (!authEnabled()) {
    return NextResponse.json({ ok: true, next });
  }

  if (!password || password.length > 200 || !verifyPassword(password)) {
    return NextResponse.json(
      { error: { code: "INVALID_PASSWORD", message: "访问密码不正确。" } },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, next });
  response.cookies.set({
    name: AUTH_COOKIE,
    value: accessToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
    path: "/",
    maxAge: AUTH_MAX_AGE_SECONDS,
  });
  return response;
}
