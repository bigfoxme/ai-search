import type { SearchFilters } from "./types";

export const MAX_QUERY_LENGTH = 128;

export interface ParsedSites {
  sites: string[];
  invalid: string[];
}

/** Count Unicode code points (matches the API's character limit). */
export function countUnicodeChars(value: string): number {
  return Array.from(value).length;
}

/** Split a comma / whitespace / Chinese punctuation separated input into tokens. */
export function splitTokens(value: string): string[] {
  return value
    .split(/[\s,，、;；]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

/**
 * Normalize a user-entered site into a bare hostname.
 * Accepts pasted URLs such as https://github.com/foo and "site:" prefixes.
 */
export function normalizeSite(raw: string): string | null {
  let value = raw
    .trim()
    .toLowerCase()
    .replace(/^(?:-?site:)/, "")
    .replace(/^\*\./, "")
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, "");

  // Drop path, query, fragment and port.
  value = value.split(/[/?#]/)[0] ?? "";
  value = value.replace(/:\d+$/, "").replace(/^\.+|\.+$/g, "");

  if (
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(value)
  ) {
    return null;
  }
  return value;
}

export function parseSites(value: string): ParsedSites {
  const sites: string[] = [];
  const invalid: string[] = [];
  for (const token of splitTokens(value)) {
    const normalized = normalizeSite(token);
    if (normalized) {
      if (!sites.includes(normalized)) sites.push(normalized);
    } else {
      invalid.push(token);
    }
  }
  return { sites, invalid };
}

const LANG_PATTERN = /^[a-z]{2,3}(?:-[a-z]{2,4})?$/;

export function parseLangs(value: string): { langs: string[]; invalid: string[] } {
  const langs: string[] = [];
  const invalid: string[] = [];
  for (const token of splitTokens(value.replace(/,/g, " "))) {
    const lang = token.toLowerCase();
    if (LANG_PATTERN.test(lang)) {
      if (!langs.includes(lang)) langs.push(lang);
    } else {
      invalid.push(token);
    }
  }
  return { langs, invalid };
}

/**
 * Split exclude terms while keeping quoted phrases intact.
 * `-广告 "release notes"` -> ["广告", "release notes"]
 */
export function splitTerms(value: string): string[] {
  const tokens: string[] = [];
  const pattern = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    const token = (match[1] ?? match[2] ?? "")
      .trim()
      .replace(/^-+/, "")
      .trim();
    if (token) tokens.push(token);
  }
  return tokens;
}

function quotePhrase(value: string): string {
  return `"${value.replace(/"/g, " ").replace(/\s+/g, " ").trim()}"`;
}

function excludeToken(value: string): string {
  return /\s/.test(value) ? `-"${value.replace(/"/g, " ").trim()}"` : `-${value}`;
}

const DATE_PATTERN = /^\d{4}(?:-\d{2}-\d{2})?$/;

export function isValidDateValue(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  if (/^\d{4}$/.test(value)) return true;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/**
 * Compose the final DeepSeek query from structured filters.
 * Operators are appended after the free-text keywords so user-typed syntax is
 * preserved. Invalid sites / languages are silently dropped (the server rejects
 * them with a friendly message when called directly).
 */
export function buildQuery(filters: SearchFilters): string {
  const parts: string[] = [];

  const keywords = filters.keywords.trim().replace(/\s+/g, " ");
  if (keywords) parts.push(keywords);

  const phrase = filters.phrase.replace(/"/g, " ").replace(/\s+/g, " ").trim();
  if (phrase) parts.push(quotePhrase(phrase));

  const excludeTerms: string[] = [];
  for (const token of splitTerms(filters.excludeTerms)) {
    if (!excludeTerms.includes(token)) excludeTerms.push(token);
  }
  for (const term of excludeTerms) parts.push(excludeToken(term));

  const { sites } = parseSites(filters.sites);
  if (sites.length > 0) {
    parts.push(sites.map((site) => `site:${site}`).join(" OR "));
  }

  const { sites: excludeSites } = parseSites(filters.excludeSites);
  for (const site of excludeSites) parts.push(`-site:${site}`);

  const { langs } = parseLangs(filters.langs);
  if (langs.length > 0) parts.push(`lang:${langs.join(",")}`);

  const after = filters.after.trim();
  if (after && isValidDateValue(after)) parts.push(`after:${after}`);

  const before = filters.before.trim();
  if (before && isValidDateValue(before)) parts.push(`before:${before}`);

  return parts.join(" ");
}

export function isQueryTooLong(query: string): boolean {
  return countUnicodeChars(query) > MAX_QUERY_LENGTH;
}
