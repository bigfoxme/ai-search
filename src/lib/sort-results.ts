import type { SearchResult, SortMode } from "./types";

function dateValue(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export function sortResults(
  results: SearchResult[],
  sort: SortMode,
): SearchResult[] {
  if (sort === "relevance") return results;

  const copy = [...results];
  if (sort === "newest") {
    copy.sort((a, b) => dateValue(b.date) - dateValue(a.date));
  } else {
    copy.sort(
      (a, b) => b.authority - a.authority || b.rerank_score - a.rerank_score,
    );
  }
  return copy;
}
