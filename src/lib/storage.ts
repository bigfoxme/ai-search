import { searchSignature } from "./search-params";
import type { SearchResult, SearchState } from "./types";

export const HISTORY_KEY = "ds:history";
export const FAVORITES_KEY = "ds:favorites";
export const THEME_KEY = "ds:theme";
export const HISTORY_LIMIT = 20;
export const FAVORITES_LIMIT = 100;

export type ThemeMode = "light" | "dark" | "system";

export interface HistoryItem {
  id: string;
  state: SearchState;
  query: string;
  resultCount: number;
  searchedAt: number;
}

export interface FavoriteItem {
  url: string;
  title: string;
  snippet: string;
  siteName: string | null;
  siteIcon: string | null;
  date: string | null;
  authority: number;
  rerankScore: number;
  query: string;
  savedAt: number;
}

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage may be full or disabled; the app still works without persistence.
  }
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HistoryItem>;
  return (
    typeof item.id === "string" &&
    typeof item.query === "string" &&
    typeof item.resultCount === "number" &&
    typeof item.searchedAt === "number" &&
    !!item.state &&
    typeof item.state === "object" &&
    typeof item.state.keywords === "string"
  );
}

function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<FavoriteItem>;
  return (
    typeof item.url === "string" &&
    typeof item.title === "string" &&
    typeof item.snippet === "string" &&
    typeof item.savedAt === "number"
  );
}

export function readHistory(): HistoryItem[] {
  const data = readJson<unknown>(HISTORY_KEY);
  if (!Array.isArray(data)) return [];
  return data.filter(isHistoryItem).slice(0, HISTORY_LIMIT);
}

export function writeHistory(items: HistoryItem[]): void {
  writeJson(HISTORY_KEY, items.slice(0, HISTORY_LIMIT));
}

export function clearStoredHistory(): void {
  writeJson(HISTORY_KEY, []);
}

export function makeHistoryItem(
  state: SearchState,
  query: string,
  resultCount: number,
): HistoryItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    state: { ...state },
    query,
    resultCount,
    searchedAt: Date.now(),
  };
}

export function addHistoryItem(
  items: HistoryItem[],
  item: HistoryItem,
): HistoryItem[] {
  const signature = searchSignature(item.state);
  return [
    item,
    ...items.filter((existing) => searchSignature(existing.state) !== signature),
  ].slice(0, HISTORY_LIMIT);
}

export function readFavorites(): FavoriteItem[] {
  const data = readJson<unknown>(FAVORITES_KEY);
  if (!Array.isArray(data)) return [];
  return data
    .filter(isFavoriteItem)
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(0, FAVORITES_LIMIT);
}

export function writeFavorites(items: FavoriteItem[]): void {
  writeJson(FAVORITES_KEY, items.slice(0, FAVORITES_LIMIT));
}

export function clearStoredFavorites(): void {
  writeJson(FAVORITES_KEY, []);
}

export function favoriteFromResult(
  result: SearchResult,
  query: string,
): FavoriteItem {
  return {
    url: result.url,
    title: result.title,
    snippet: result.snippet,
    siteName: result.site_name,
    siteIcon: result.site_icon,
    date: result.date,
    authority: result.authority,
    rerankScore: result.rerank_score,
    query,
    savedAt: Date.now(),
  };
}

export function toggleFavoriteItem(
  items: FavoriteItem[],
  favorite: FavoriteItem,
): FavoriteItem[] {
  if (items.some((item) => item.url === favorite.url)) {
    return items.filter((item) => item.url !== favorite.url);
  }
  return [favorite, ...items].slice(0, FAVORITES_LIMIT);
}

export function readTheme(): ThemeMode {
  const value = readJson<unknown>(THEME_KEY);
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

const THEME_EVENT = "ds:theme-change";

export function subscribeTheme(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(THEME_EVENT, callback);
  };
}

export function getThemeSnapshot(): ThemeMode {
  return readTheme();
}

export function getServerThemeSnapshot(): ThemeMode {
  return "system";
}

export function writeTheme(theme: ThemeMode): void {
  writeJson(THEME_KEY, theme);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(THEME_EVENT));
  }
}
