import type { SearchResult } from "./types";

const MAX_ENTRIES = 100;

interface CacheEntry {
  results: SearchResult[];
  expiresAt: number;
}

type CacheGlobal = typeof globalThis & {
  __dsSearchCache?: Map<string, CacheEntry>;
};

const globalStore = globalThis as CacheGlobal;
const store = (globalStore.__dsSearchCache ??= new Map<string, CacheEntry>());

export function makeCacheKey(query: string, count: number): string {
  return `${query}\u0000${count}`;
}

export function getCached(key: string): SearchResult[] | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  // Refresh insertion order for a tiny LRU.
  store.delete(key);
  store.set(key, entry);
  return entry.results;
}

export function setCached(
  key: string,
  results: SearchResult[],
  ttlMs: number,
): void {
  if (ttlMs <= 0) return;
  store.delete(key);
  store.set(key, { results, expiresAt: Date.now() + ttlMs });
  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}
