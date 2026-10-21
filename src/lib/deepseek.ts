import type { SearchResult } from "./types";

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const TIMEOUT_MS = 15_000;

export class UpstreamError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeResult(raw: unknown): SearchResult | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const url = asString(item.url);
  if (!url) return null;

  const authority = asNumber(item.authority, -1);
  return {
    rerank_score: asNumber(item.rerank_score, 0),
    title: asString(item.title) || url,
    url,
    snippet: asString(item.snippet),
    summary: asString(item.summary),
    site_name: asNullableString(item.site_name),
    site_icon: asNullableString(item.site_icon),
    date: asNullableString(item.date),
    // Keep the API's documented range, including -1 for "unknown".
    authority: authority >= -1 && authority <= 4 ? Math.trunc(authority) : -1,
  };
}

export async function searchDeepSeek(
  query: string,
  count: number,
  oriQuestion?: string,
): Promise<SearchResult[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new UpstreamError(503, "服务器未配置 DEEPSEEK_API_KEY");
  }

  const baseUrl = (process.env.DEEPSEEK_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    "",
  );
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/v1/tools/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        count,
        ...(oriQuestion ? { ori_question: oriQuestion } : {}),
        need_content: false,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      let upstreamMessage = "";
      try {
        const data = (await response.json()) as {
          error?: { message?: unknown };
        };
        upstreamMessage = asString(data?.error?.message);
      } catch {
        // Ignore non-JSON error bodies.
      }
      throw new UpstreamError(
        response.status,
        upstreamMessage || `上游搜索服务返回 ${response.status}`,
      );
    }

    const data = (await response.json()) as { results?: unknown };
    if (!Array.isArray(data.results)) {
      throw new UpstreamError(502, "上游响应格式异常");
    }

    return data.results
      .map(normalizeResult)
      .filter((item): item is SearchResult => item !== null);
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new UpstreamError(504, "搜索请求超时");
    }
    throw new UpstreamError(502, "无法连接搜索服务");
  } finally {
    clearTimeout(timer);
  }
}
