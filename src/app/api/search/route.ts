import { NextResponse, type NextRequest } from "next/server";
import { getCached, makeCacheKey, setCached } from "@/lib/cache";
import { searchDeepSeek, UpstreamError } from "@/lib/deepseek";
import { mockSearch } from "@/lib/mock";
import { buildQuery, countUnicodeChars } from "@/lib/query-builder";
import {
  checkDailyLimit,
  checkRateLimit,
  getClientIp,
  readIntEnv,
} from "@/lib/rate-limit";
import { validateSearchBody } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

function jsonError(
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store", ...headers } },
  );
}

function mapUpstreamError(error: UpstreamError): {
  status: number;
  code: string;
  message: string;
} {
  switch (error.status) {
    case 400:
      return {
        status: 400,
        code: "UPSTREAM_BAD_REQUEST",
        message: `搜索参数有误：${error.message.slice(0, 200)}`,
      };
    case 401:
    case 403:
      return {
        status: 502,
        code: "API_KEY_INVALID",
        message: "服务器配置的 DeepSeek API Key 无效或没有权限。",
      };
    case 402:
      return {
        status: 402,
        code: "INSUFFICIENT_BALANCE",
        message: "DeepSeek 账户余额不足，请先充值。",
      };
    case 408:
    case 504:
      return {
        status: 504,
        code: "UPSTREAM_TIMEOUT",
        message: "搜索服务响应超时，请稍后重试。",
      };
    case 429:
      return {
        status: 429,
        code: "UPSTREAM_RATE_LIMITED",
        message: "搜索服务请求过于频繁，请稍后重试。",
      };
    case 503:
      return {
        status: 503,
        code: "NO_API_KEY",
        message:
          "服务器尚未配置 DEEPSEEK_API_KEY，请在 .env.local 中设置后重启。",
      };
    default:
      return {
        status: 502,
        code: "UPSTREAM_ERROR",
        message: "搜索服务暂时不可用，请稍后重试。",
      };
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  const limit = readIntEnv("RATE_LIMIT_PER_MINUTE", 20);
  const rate = checkRateLimit(`search:${ip}`, limit);
  const rateHeaders: Record<string, string> =
    rate.limit > 0
      ? {
          "X-RateLimit-Limit": String(rate.limit),
          "X-RateLimit-Remaining": String(rate.remaining),
        }
      : {};

  if (!rate.ok) {
    return jsonError(429, "RATE_LIMITED", "请求过于频繁，请稍后再试。", {
      ...rateHeaders,
      "Retry-After": String(rate.retryAfter),
    });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 20_000) {
    return jsonError(413, "PAYLOAD_TOO_LARGE", "请求体过大。", rateHeaders);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "请求体不是合法的 JSON。", rateHeaders);
  }

  const parsed = validateSearchBody(body);
  if (!parsed.ok) {
    return jsonError(400, "INVALID_REQUEST", parsed.message, rateHeaders);
  }

  const { state } = parsed;
  const query = buildQuery(state);
  const startedAt = Date.now();

  // Mock mode works without an API key and never touches the cache or billing.
  if (process.env.MOCK_SEARCH === "1") {
    const results = mockSearch(query, state.count);
    await new Promise((resolve) => setTimeout(resolve, 250));
    if (results === null) {
      return jsonError(
        500,
        "MOCK_UPSTREAM_ERROR",
        "这是模拟的搜索服务错误。",
        rateHeaders,
      );
    }
    return NextResponse.json(
      {
        results,
        query,
        elapsedMs: Date.now() - startedAt,
        cached: false,
      },
      { headers: { "Cache-Control": "no-store", ...rateHeaders } },
    );
  }

  const cacheKey = makeCacheKey(query, state.count);
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(
      { results: cached, query, elapsedMs: 0, cached: true },
      { headers: { "Cache-Control": "no-store", ...rateHeaders } },
    );
  }

  if (!process.env.DEEPSEEK_API_KEY) {
    return jsonError(
      503,
      "NO_API_KEY",
      "服务器尚未配置 DEEPSEEK_API_KEY，请在 .env.local 中设置后重启。",
      rateHeaders,
    );
  }

  const daily = checkDailyLimit(readIntEnv("DAILY_SEARCH_LIMIT", 0));
  if (!daily.ok) {
    return jsonError(
      429,
      "DAILY_LIMIT",
      "今日搜索额度已用完，请明天再试。",
      rateHeaders,
    );
  }

  const originalKeywords = state.keywords.trim();
  const oriQuestion =
    originalKeywords &&
    originalKeywords !== query &&
    countUnicodeChars(originalKeywords) <= 128
      ? originalKeywords
      : undefined;

  try {
    const results = await searchDeepSeek(query, state.count, oriQuestion);
    const ttl =
      results.length > 0
        ? readIntEnv("SEARCH_CACHE_TTL_MS", DEFAULT_CACHE_TTL_MS)
        : 60_000;
    setCached(cacheKey, results, ttl);

    return NextResponse.json(
      {
        results,
        query,
        elapsedMs: Date.now() - startedAt,
        cached: false,
      },
      { headers: { "Cache-Control": "no-store", ...rateHeaders } },
    );
  } catch (error) {
    if (error instanceof UpstreamError) {
      const mapped = mapUpstreamError(error);
      return jsonError(mapped.status, mapped.code, mapped.message, rateHeaders);
    }
    return jsonError(
      502,
      "UPSTREAM_ERROR",
      "搜索服务暂时不可用，请稍后重试。",
      rateHeaders,
    );
  }
}
