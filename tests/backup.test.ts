import { describe, expect, it } from "vitest";
import {
  BACKUP_VERSION,
  makeBackup,
  mergeBackup,
  parseBackup,
} from "@/lib/backup";
import {
  FAVORITES_LIMIT,
  HISTORY_LIMIT,
  type FavoriteItem,
  type HistoryItem,
} from "@/lib/storage";
import type { SearchState } from "@/lib/types";

function state(keywords: string): SearchState {
  return {
    keywords,
    phrase: "",
    excludeTerms: "",
    sites: "",
    excludeSites: "",
    langs: "",
    after: "",
    before: "",
    count: 10,
    sort: "relevance",
  };
}

function history(keywords: string, searchedAt: number): HistoryItem {
  return {
    id: `history-${keywords}`,
    state: state(keywords),
    query: keywords,
    resultCount: 1,
    searchedAt,
  };
}

function favorite(url: string, savedAt: number): FavoriteItem {
  return {
    url,
    title: `title-${url}`,
    snippet: "",
    siteName: null,
    siteIcon: null,
    date: null,
    authority: 0,
    rerankScore: 0,
    query: "",
    savedAt,
  };
}

describe("makeBackup", () => {
  it("creates a versioned backup with both collections", () => {
    const backup = makeBackup(
      [history("a", 1)],
      [favorite("https://a.example", 1)],
    );
    expect(backup.version).toBe(BACKUP_VERSION);
    expect(typeof backup.exportedAt).toBe("string");
    expect(backup.history).toHaveLength(1);
    expect(backup.favorites).toHaveLength(1);
  });
});

describe("parseBackup", () => {
  it("round-trips a backup created by makeBackup", () => {
    const parsed = parseBackup(
      makeBackup([history("a", 1)], [favorite("https://a.example", 1)]),
    );
    expect(parsed?.history).toHaveLength(1);
    expect(parsed?.favorites).toHaveLength(1);
    expect(parsed?.history[0].state.keywords).toBe("a");
    expect(parsed?.favorites[0].url).toBe("https://a.example");
  });

  it("rejects non-object data and files without either collection", () => {
    for (const raw of [null, "x", 42, [], {}, { history: "x" }]) {
      expect(parseBackup(raw)).toBeNull();
    }
  });

  it("accepts a partial backup and defaults missing state fields", () => {
    const parsed = parseBackup({
      favorites: [favorite("https://a.example", 1)],
      history: [
        {
          id: "one",
          state: { keywords: "only" },
          query: "only",
          resultCount: 2,
          searchedAt: 3,
        },
      ],
    });
    expect(parsed?.favorites).toHaveLength(1);
    expect(parsed?.history[0].state).toMatchObject({
      keywords: "only",
      phrase: "",
      count: 10,
      sort: "relevance",
    });
  });

  it("drops malformed history entries and unsafe favorite URLs", () => {
    const parsed = parseBackup({
      history: [
        history("ok", 1),
        {
          id: "bad-state",
          state: { keywords: 123 },
          query: "",
          resultCount: 0,
          searchedAt: 1,
        },
        { id: "no-state", query: "", resultCount: 0, searchedAt: 1 },
      ],
      favorites: [
        favorite("https://ok.example", 1),
        favorite("javascript:alert(1)", 2),
        favorite("data:text/html,hi", 3),
        { url: "https://no-title.example", savedAt: 4 },
      ],
    });

    expect(parsed?.history.map((item) => item.state.keywords)).toEqual(["ok"]);
    expect(parsed?.favorites.map((item) => item.url)).toEqual([
      "https://no-title.example",
      "https://ok.example",
    ]);
    expect(parsed?.favorites[0].title).toBe("https://no-title.example");
  });

  it("dedupes and limits imported collections", () => {
    const historyItems = Array.from({ length: HISTORY_LIMIT + 10 }, (_, i) =>
      history(`q${i}`, i),
    );
    const favoriteItems = Array.from(
      { length: FAVORITES_LIMIT + 10 },
      (_, i) => favorite(`https://example.test/${i}`, i),
    );
    const parsed = parseBackup({
      history: [...historyItems, historyItems[0]],
      favorites: [...favoriteItems, favoriteItems[0]],
    });

    expect(parsed?.history).toHaveLength(HISTORY_LIMIT);
    expect(parsed?.favorites).toHaveLength(FAVORITES_LIMIT);
    expect(parsed?.history[0].searchedAt).toBe(HISTORY_LIMIT + 9);
  });
});

describe("mergeBackup", () => {
  it("merges history by search signature and keeps the newest copy", () => {
    const merged = mergeBackup(
      [history("a", 100), history("b", 50)],
      [],
      { history: [history("a", 200), history("c", 150)], favorites: [] },
    );

    expect(merged.addedHistory).toBe(1);
    expect(
      merged.history.map((item) => `${item.state.keywords}:${item.searchedAt}`),
    ).toEqual(["a:200", "c:150", "b:50"]);
  });

  it("merges favorites by URL and keeps the newest copy", () => {
    const merged = mergeBackup(
      [],
      [favorite("https://a.example", 100)],
      {
        history: [],
        favorites: [
          favorite("https://a.example", 200),
          favorite("https://b.example", 150),
        ],
      },
    );

    expect(merged.addedFavorites).toBe(1);
    expect(
      merged.favorites.map((item) => `${item.url}:${item.savedAt}`),
    ).toEqual(["https://a.example:200", "https://b.example:150"]);
  });

  it("reports zero additions when the backup is already present", () => {
    const currentHistory = [history("a", 100)];
    const currentFavorites = [favorite("https://a.example", 100)];
    const merged = mergeBackup(currentHistory, currentFavorites, {
      history: currentHistory,
      favorites: currentFavorites,
    });

    expect(merged.addedHistory).toBe(0);
    expect(merged.addedFavorites).toBe(0);
  });
});
