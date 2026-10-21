import {
  buildQuery,
  countUnicodeChars,
  isValidDateValue,
  MAX_QUERY_LENGTH,
  parseLangs,
  parseSites,
} from "./query-builder";
import { DEFAULT_SEARCH_STATE, type SearchState } from "./types";

const FIELD_LIMITS = {
  keywords: 200,
  phrase: 120,
  excludeTerms: 200,
  sites: 300,
  excludeSites: 300,
  langs: 60,
  after: 10,
  before: 10,
} as const;

export type ValidationResult =
  | { ok: true; state: SearchState }
  | { ok: false; message: string };

class InputError extends Error {}

function readText(
  body: Record<string, unknown>,
  key: keyof typeof FIELD_LIMITS,
): string {
  const value = body[key];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new InputError(`${key} 必须是字符串`);
  }
  const trimmed = value.trim();
  if (trimmed.length > FIELD_LIMITS[key]) {
    throw new InputError(`${key} 过长`);
  }
  return trimmed;
}

export function validateSearchBody(input: unknown): ValidationResult {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return { ok: false, message: "请求体格式不正确" };
    }
    const body = input as Record<string, unknown>;

    const keywords = readText(body, "keywords");
    const phrase = readText(body, "phrase");
    const excludeTerms = readText(body, "excludeTerms");
    const sites = readText(body, "sites");
    const excludeSites = readText(body, "excludeSites");
    const langs = readText(body, "langs");
    const after = readText(body, "after");
    const before = readText(body, "before");

    let count = DEFAULT_SEARCH_STATE.count;
    if (body.count !== undefined && body.count !== null) {
      if (
        typeof body.count !== "number" ||
        !Number.isInteger(body.count) ||
        body.count < 1 ||
        body.count > 50
      ) {
        throw new InputError("count 必须是 1 到 50 之间的整数");
      }
      count = body.count;
    }

    if (after && !isValidDateValue(after)) {
      throw new InputError("起始日期格式应为 YYYY-MM-DD");
    }
    if (before && !isValidDateValue(before)) {
      throw new InputError("截止日期格式应为 YYYY-MM-DD");
    }
    if (after && before && after > before) {
      throw new InputError("起始日期不能晚于截止日期");
    }

    const include = parseSites(sites);
    const exclude = parseSites(excludeSites);
    const invalidSites = [...include.invalid, ...exclude.invalid];
    if (invalidSites.length > 0) {
      throw new InputError(
        `站点格式不正确：${invalidSites.slice(0, 3).join("、")}`,
      );
    }

    const parsedLangs = parseLangs(langs);
    if (parsedLangs.invalid.length > 0) {
      throw new InputError(
        `语言代码格式不正确：${parsedLangs.invalid.slice(0, 3).join("、")}`,
      );
    }

    const state: SearchState = {
      keywords,
      phrase,
      excludeTerms,
      sites,
      excludeSites,
      langs,
      after,
      before,
      count,
      sort: DEFAULT_SEARCH_STATE.sort,
    };

    const query = buildQuery(state);
    if (!query) {
      return { ok: false, message: "请输入搜索关键词或至少一个筛选条件" };
    }

    const length = countUnicodeChars(query);
    if (length > MAX_QUERY_LENGTH) {
      return {
        ok: false,
        message: `组合后的查询为 ${length} 个字符，超过 ${MAX_QUERY_LENGTH} 字符上限，请精简筛选条件`,
      };
    }

    return { ok: true, state };
  } catch (error) {
    if (error instanceof InputError) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "请求参数不合法" };
  }
}
