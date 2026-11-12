import { searchSignature } from "./search-params";
import {
  FAVORITES_LIMIT,
  HISTORY_LIMIT,
  type FavoriteItem,
  type HistoryItem,
} from "./storage";
import {
  DEFAULT_SEARCH_STATE,
  SORT_MODES,
  type SearchFilters,
  type SearchState,
  type SortMode,
} from "./types";

export const BACKUP_VERSION = 1;
export const MAX_BACKUP_BYTES = 2 * 1024 * 1024;

export interface BackupFile {
  version: number;
  exportedAt: string;
  history: HistoryItem[];
  favorites: FavoriteItem[];
}

export interface BackupContents {
  history: HistoryItem[];
  favorites: FavoriteItem[];
}

export interface MergeResult {
  history: HistoryItem[];
  favorites: FavoriteItem[];
  addedHistory: number;
  addedFavorites: number;
}

export interface BackupStatus {
  kind: "ok" | "error";
  text: string;
}

// Same field caps as the URL parser, generous enough for data the app created.
const TEXT_FIELDS = [
  ["keywords", 500],
  ["phrase", 300],
  ["excludeTerms", 300],
  ["sites", 500],
  ["excludeSites", 500],
  ["langs", 100],
  ["after", 10],
  ["before", 10],
] as const satisfies readonly (readonly [keyof SearchFilters, number])[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length === 0) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:"
      ? value
      : null;
  } catch {
    return null;
  }
}

function sanitizeSort(value: unknown): SortMode {
  return typeof value === "string" &&
    (SORT_MODES as readonly string[]).includes(value)
    ? (value as SortMode)
    : DEFAULT_SEARCH_STATE.sort;
}

function sanitizeState(value: unknown): SearchState | null {
  if (!isRecord(value)) return null;

  const state: SearchState = { ...DEFAULT_SEARCH_STATE };
  for (const [field, limit] of TEXT_FIELDS) {
    const raw = value[field];
    if (raw === undefined || raw === null) continue;
    if (typeof raw !== "string") return null;
    state[field] = raw.slice(0, limit);
  }

  const rawCount = value.count;
  state.count =
    typeof rawCount === "number" &&
    Number.isInteger(rawCount) &&
    rawCount >= 1 &&
    rawCount <= 50
      ? rawCount
      : DEFAULT_SEARCH_STATE.count;
  state.sort = sanitizeSort(value.sort);
  return state;
}

function sanitizeHistoryItem(value: unknown): HistoryItem | null {
  if (!isRecord(value)) return null;

  const state = sanitizeState(value.state);
  if (!state) return null;

  const searchedAt = asFiniteNumber(value.searchedAt) ?? Date.now();
  const query = typeof value.query === "string" ? value.query.slice(0, 512) : "";
  const resultCount = asFiniteNumber(value.resultCount);
  const id =
    typeof value.id === "string" && value.id
      ? value.id.slice(0, 100)
      : searchSignature(state);

  return {
    id,
    state,
    query,
    resultCount: resultCount === null ? 0 : Math.max(0, Math.trunc(resultCount)),
    searchedAt,
  };
}

function sanitizeFavorite(value: unknown): FavoriteItem | null {
  if (!isRecord(value)) return null;

  const url = asHttpUrl(value.url);
  if (!url) return null;

  const title =
    typeof value.title === "string" && value.title
      ? value.title.slice(0, 500)
      : url;
  const siteName =
    typeof value.siteName === "string" && value.siteName
      ? value.siteName.slice(0, 200)
      : null;
  const date =
    typeof value.date === "string" && value.date
      ? value.date.slice(0, 50)
      : null;
  const authority = asFiniteNumber(value.authority);

  return {
    url,
    title,
    snippet:
      typeof value.snippet === "string" ? value.snippet.slice(0, 2000) : "",
    siteName,
    siteIcon: asHttpUrl(value.siteIcon),
    date,
    authority: authority === null ? -1 : Math.trunc(authority),
    rerankScore: asFiniteNumber(value.rerankScore) ?? 0,
    query: typeof value.query === "string" ? value.query.slice(0, 512) : "",
    savedAt: asFiniteNumber(value.savedAt) ?? Date.now(),
  };
}

function dedupeHistory(items: HistoryItem[]): HistoryItem[] {
  const bySignature = new Map<string, HistoryItem>();
  for (const item of items) {
    const signature = searchSignature(item.state);
    const existing = bySignature.get(signature);
    if (!existing || item.searchedAt > existing.searchedAt) {
      bySignature.set(signature, item);
    }
  }
  return [...bySignature.values()]
    .sort((a, b) => b.searchedAt - a.searchedAt)
    .slice(0, HISTORY_LIMIT);
}

function dedupeFavorites(items: FavoriteItem[]): FavoriteItem[] {
  const byUrl = new Map<string, FavoriteItem>();
  for (const item of items) {
    const existing = byUrl.get(item.url);
    if (!existing || item.savedAt > existing.savedAt) {
      byUrl.set(item.url, item);
    }
  }
  return [...byUrl.values()]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, FAVORITES_LIMIT);
}

export function makeBackup(
  history: HistoryItem[],
  favorites: FavoriteItem[],
): BackupFile {
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    history: history.slice(0, HISTORY_LIMIT),
    favorites: favorites.slice(0, FAVORITES_LIMIT),
  };
}

/**
 * Parses a backup file. Unknown fields are ignored, invalid entries are
 * dropped, and URLs are restricted to http(s) so imported data cannot inject
 * script URLs into the UI.
 */
export function parseBackup(raw: unknown): BackupContents | null {
  if (!isRecord(raw)) return null;

  const historyRaw = raw.history;
  const favoritesRaw = raw.favorites;
  if (!Array.isArray(historyRaw) && !Array.isArray(favoritesRaw)) return null;

  const history = (Array.isArray(historyRaw) ? historyRaw : [])
    .slice(0, HISTORY_LIMIT * 5)
    .map(sanitizeHistoryItem)
    .filter((item): item is HistoryItem => item !== null);
  const favorites = (Array.isArray(favoritesRaw) ? favoritesRaw : [])
    .slice(0, FAVORITES_LIMIT * 5)
    .map(sanitizeFavorite)
    .filter((item): item is FavoriteItem => item !== null);

  return {
    history: dedupeHistory(history),
    favorites: dedupeFavorites(favorites),
  };
}

export function mergeBackup(
  currentHistory: HistoryItem[],
  currentFavorites: FavoriteItem[],
  incoming: BackupContents,
): MergeResult {
  const currentSignatures = new Set(
    currentHistory.map((item) => searchSignature(item.state)),
  );
  const currentUrls = new Set(currentFavorites.map((item) => item.url));

  const addedHistory = new Set(
    incoming.history
      .map((item) => searchSignature(item.state))
      .filter((signature) => !currentSignatures.has(signature)),
  ).size;
  const addedFavorites = new Set(
    incoming.favorites
      .map((item) => item.url)
      .filter((url) => !currentUrls.has(url)),
  ).size;

  return {
    history: dedupeHistory([...currentHistory, ...incoming.history]),
    favorites: dedupeFavorites([...currentFavorites, ...incoming.favorites]),
    addedHistory,
    addedFavorites,
  };
}
