import {
  DEFAULT_SEARCH_STATE,
  SORT_MODES,
  type SearchState,
  type SortMode,
} from "./types";
import { buildQuery } from "./query-builder";

const PARAMS = {
  keywords: "q",
  phrase: "phrase",
  excludeTerms: "exclude",
  sites: "sites",
  excludeSites: "xsite",
  langs: "lang",
  after: "after",
  before: "before",
  count: "count",
  sort: "sort",
} as const;

export function parseSearchParams(params: URLSearchParams): SearchState {
  const rawCount = Number(params.get("count"));
  const count =
    Number.isInteger(rawCount) && rawCount >= 1 && rawCount <= 50
      ? rawCount
      : DEFAULT_SEARCH_STATE.count;

  const rawSort = params.get("sort") as SortMode | null;
  const sort =
    rawSort && SORT_MODES.includes(rawSort) ? rawSort : DEFAULT_SEARCH_STATE.sort;

  return {
    keywords: (params.get(PARAMS.keywords) ?? "").slice(0, 500),
    phrase: (params.get(PARAMS.phrase) ?? "").slice(0, 300),
    excludeTerms: (params.get(PARAMS.excludeTerms) ?? "").slice(0, 300),
    sites: (params.get(PARAMS.sites) ?? "").slice(0, 500),
    excludeSites: (params.get(PARAMS.excludeSites) ?? "").slice(0, 500),
    langs: (params.get(PARAMS.langs) ?? "").slice(0, 100),
    after: (params.get(PARAMS.after) ?? "").slice(0, 10),
    before: (params.get(PARAMS.before) ?? "").slice(0, 10),
    count,
    sort,
  };
}

export function toSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  const setIf = (key: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
  };

  setIf(PARAMS.keywords, state.keywords);
  setIf(PARAMS.phrase, state.phrase);
  setIf(PARAMS.excludeTerms, state.excludeTerms);
  setIf(PARAMS.sites, state.sites);
  setIf(PARAMS.excludeSites, state.excludeSites);
  setIf(PARAMS.langs, state.langs);
  setIf(PARAMS.after, state.after);
  setIf(PARAMS.before, state.before);
  if (state.count !== DEFAULT_SEARCH_STATE.count) {
    params.set(PARAMS.count, String(state.count));
  }
  if (state.sort !== DEFAULT_SEARCH_STATE.sort) {
    params.set(PARAMS.sort, state.sort);
  }
  return params;
}

export function toQueryString(state: SearchState): string {
  return toSearchParams(state).toString();
}

/**
 * Signature of everything that affects the upstream request. Sort order is
 * deliberately excluded so re-sorting never spends an extra API call.
 */
export function searchSignature(state: SearchState): string {
  return JSON.stringify([
    state.keywords.trim(),
    state.phrase.trim(),
    state.excludeTerms.trim(),
    state.sites.trim(),
    state.excludeSites.trim(),
    state.langs.trim(),
    state.after,
    state.before,
    state.count,
  ]);
}

export function hasSearch(state: SearchState): boolean {
  return buildQuery(state).length > 0;
}

export function countActiveFilters(state: SearchState): number {
  let count = 0;
  if (state.phrase.trim()) count += 1;
  if (state.excludeTerms.trim()) count += 1;
  if (state.sites.trim()) count += 1;
  if (state.excludeSites.trim()) count += 1;
  if (state.langs.trim()) count += 1;
  if (state.after) count += 1;
  if (state.before) count += 1;
  return count;
}
