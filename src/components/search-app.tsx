"use client";

import {
  Check,
  ChevronDown,
  Copy,
  CornerDownLeft,
  History,
  SlidersHorizontal,
  Sparkles,
  Star,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "@/hooks/use-hotkeys";
import {
  MAX_BACKUP_BYTES,
  makeBackup,
  mergeBackup,
  parseBackup,
  type BackupStatus,
} from "@/lib/backup";
import { cn } from "@/lib/cn";
import { formatElapsed } from "@/lib/format";
import {
  buildQuery,
  countUnicodeChars,
  MAX_QUERY_LENGTH,
} from "@/lib/query-builder";
import {
  countActiveFilters,
  hasSearch,
  parseSearchParams,
  searchSignature,
  toSearchParams,
} from "@/lib/search-params";
import { sortResults } from "@/lib/sort-results";
import {
  addHistoryItem,
  clearStoredFavorites,
  clearStoredHistory,
  favoriteFromResult,
  makeHistoryItem,
  readFavorites,
  readHistory,
  toggleFavoriteItem,
  writeFavorites,
  writeHistory,
  type FavoriteItem,
  type HistoryItem,
} from "@/lib/storage";
import {
  DEFAULT_SEARCH_STATE,
  type ApiErrorBody,
  type SearchApiResponse,
  type SearchMeta,
  type SearchResult,
  type SearchState,
  type SortMode,
} from "@/lib/types";
import { AdvancedFilters } from "./advanced-filters";
import { FavoritesPanel } from "./favorites-panel";
import { HistoryPanel } from "./history-panel";
import { ResultsList } from "./results-list";
import { SearchBar } from "./search-bar";
import { ShortcutsDialog } from "./shortcuts-dialog";

type Panel = "history" | "favorites" | "shortcuts" | null;

const SYNTAX_EXAMPLES = [
  { code: "site:github.com OR site:arxiv.org", label: "限定站点" },
  { code: '"精确短语"', label: "整句匹配" },
  { code: "-广告 -招聘", label: "排除词" },
  { code: "lang:zh after:2025-01-01", label: "语言与时间" },
];

const COUNT_OPTIONS = [10, 20, 30, 50];

function urlFor(state: SearchState): string {
  const params = toSearchParams(state).toString();
  return params ? `/?${params}` : "/";
}

export function SearchApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const urlState = useMemo(
    () => parseSearchParams(new URLSearchParams(queryString)),
    [queryString],
  );

  const [state, setState] = useState<SearchState>(urlState);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [meta, setMeta] = useState<SearchMeta | null>(null);
  const [loading, setLoading] = useState(() => hasSearch(urlState));
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [copied, setCopied] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const lastSignatureRef = useRef("");
  const programmaticUrlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  /* eslint-disable react-hooks/set-state-in-effect -- localStorage is an external store; hydrate after mount */
  useEffect(() => {
    setHistory(readHistory());
    setFavorites(readFavorites());
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const execute = useCallback(async (next: SearchState) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setActiveIndex(-1);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: next.keywords,
          phrase: next.phrase,
          excludeTerms: next.excludeTerms,
          sites: next.sites,
          excludeSites: next.excludeSites,
          langs: next.langs,
          after: next.after,
          before: next.before,
          count: next.count,
        }),
        signal: controller.signal,
      });

      if (requestId !== requestIdRef.current) return;

      const data = (await response.json().catch(() => null)) as
        | SearchApiResponse
        | ApiErrorBody
        | null;

      if (!response.ok) {
        const message =
          (data as ApiErrorBody | null)?.error?.message ??
          `搜索失败（HTTP ${response.status}）`;
        setError(message);
        setResults(null);
        setMeta(null);
        return;
      }

      const payload = data as SearchApiResponse;
      setResults(payload.results);
      setMeta({
        query: payload.query,
        elapsedMs: payload.elapsedMs,
        cached: payload.cached,
      });

      const item = makeHistoryItem(next, payload.query, payload.results.length);
      setHistory((previous) => {
        const updated = addHistoryItem(previous, item);
        writeHistory(updated);
        return updated;
      });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      if (requestId !== requestIdRef.current) return;
      setError("网络错误，请检查连接后重试。");
      setResults(null);
      setMeta(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect -- the URL is an external store, and resetting when it becomes empty is intentional */
  useEffect(() => {
    const currentUrl = queryString ? `/?${queryString}` : "/";
    const parsed = parseSearchParams(new URLSearchParams(queryString));

    if (programmaticUrlRef.current === currentUrl) {
      programmaticUrlRef.current = null;
    } else {
      setState(parsed);
    }

    if (!hasSearch(parsed)) {
      abortRef.current?.abort();
      requestIdRef.current += 1;
      setResults(null);
      setMeta(null);
      setError(null);
      setLoading(false);
      lastSignatureRef.current = "";
      return;
    }

    const signature = searchSignature(parsed);
    if (lastSignatureRef.current === signature) return;
    lastSignatureRef.current = signature;
    void execute(parsed);
  }, [queryString, execute]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const runSearch = useCallback(
    (next: SearchState) => {
      const query = buildQuery(next);
      if (!query) {
        setError("请输入搜索关键词或至少一个筛选条件。");
        inputRef.current?.focus();
        return;
      }

      const length = countUnicodeChars(query);
      if (length > MAX_QUERY_LENGTH) {
        setError(
          `组合后的查询为 ${length} 个字符，超过 ${MAX_QUERY_LENGTH} 字符上限，请精简筛选条件。`,
        );
        setFiltersOpen(true);
        return;
      }

      const signature = searchSignature(next);
      setState(next);
      lastSignatureRef.current = signature;
      router.replace(urlFor(next), { scroll: false });
      void execute(next);
    },
    [execute, router],
  );

  const submit = useCallback(() => {
    runSearch({ ...state, keywords: state.keywords.trim() });
  }, [runSearch, state]);

  const updateState = useCallback((patch: Partial<SearchState>) => {
    setState((previous) => ({ ...previous, ...patch }));
  }, []);

  const resetFilters = useCallback(() => {
    setState((previous) => ({
      ...previous,
      phrase: "",
      excludeTerms: "",
      sites: "",
      excludeSites: "",
      langs: "",
      after: "",
      before: "",
    }));
  }, []);

  const clearFiltersAndSearch = useCallback(() => {
    runSearch({
      ...state,
      phrase: "",
      excludeTerms: "",
      sites: "",
      excludeSites: "",
      langs: "",
      after: "",
      before: "",
    });
  }, [runSearch, state]);

  const changeSort = useCallback(
    (sort: SortMode) => {
      setState((previous) => ({ ...previous, sort }));
      setActiveIndex(-1);
      const nextUrl = urlFor({ ...urlState, sort });
      const currentUrl = queryString ? `/?${queryString}` : "/";
      if (nextUrl !== currentUrl) {
        programmaticUrlRef.current = nextUrl;
        router.replace(nextUrl, { scroll: false });
      }
    },
    [queryString, router, urlState],
  );

  const changeCount = useCallback(
    (count: number) => {
      setState((previous) => ({ ...previous, count }));
      const nextUrl = urlFor({ ...urlState, count });
      const currentUrl = queryString ? `/?${queryString}` : "/";
      if (nextUrl !== currentUrl) {
        programmaticUrlRef.current = nextUrl;
        router.replace(nextUrl, { scroll: false });
      }
    },
    [queryString, router, urlState],
  );

  const toggleFavorite = useCallback(
    (result: SearchResult) => {
      const favorite = favoriteFromResult(
        result,
        meta?.query || buildQuery(state),
      );
      setFavorites((previous) => {
        const updated = toggleFavoriteItem(previous, favorite);
        writeFavorites(updated);
        return updated;
      });
    },
    [meta, state],
  );

  const runHistoryItem = useCallback(
    (item: HistoryItem) => {
      setPanel(null);
      const next = parseSearchParams(
        toSearchParams({ ...DEFAULT_SEARCH_STATE, ...item.state }),
      );
      setFiltersOpen(countActiveFilters(next) > 0);
      runSearch(next);
    },
    [runSearch],
  );

  const removeHistory = useCallback((id: string) => {
    setHistory((previous) => {
      const updated = previous.filter((item) => item.id !== id);
      writeHistory(updated);
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    clearStoredHistory();
    setHistory([]);
  }, []);

  const removeFavorite = useCallback((url: string) => {
    setFavorites((previous) => {
      const updated = previous.filter((item) => item.url !== url);
      writeFavorites(updated);
      return updated;
    });
  }, []);

  const clearFavorites = useCallback(() => {
    clearStoredFavorites();
    setFavorites([]);
  }, []);

  const exportBackup = useCallback(() => {
    const backup = makeBackup(history, favorites);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `deepseek-search-backup-${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setBackupStatus({
      kind: "ok",
      text: `已导出 ${history.length} 条历史、${favorites.length} 条收藏。`,
    });
  }, [history, favorites]);

  const importBackup = useCallback(async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) {
      setBackupStatus({
        kind: "error",
        text: "备份文件过大（上限 2 MB）。",
      });
      return;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      setBackupStatus({
        kind: "error",
        text: "无法读取：文件不是合法的 JSON。",
      });
      return;
    }

    const contents = parseBackup(raw);
    if (!contents) {
      setBackupStatus({
        kind: "error",
        text: "无法识别：这不是本应用导出的备份文件。",
      });
      return;
    }
    if (contents.history.length === 0 && contents.favorites.length === 0) {
      setBackupStatus({
        kind: "error",
        text: "备份中没有可导入的有效记录。",
      });
      return;
    }

    const merged = mergeBackup(readHistory(), readFavorites(), contents);
    if (merged.addedHistory === 0 && merged.addedFavorites === 0) {
      setBackupStatus({
        kind: "ok",
        text: "备份中的记录已经存在，无需导入。",
      });
      return;
    }

    writeHistory(merged.history);
    writeFavorites(merged.favorites);
    setHistory(merged.history);
    setFavorites(merged.favorites);
    setBackupStatus({
      kind: "ok",
      text: `已导入 ${merged.addedHistory} 条历史、${merged.addedFavorites} 条收藏。`,
    });
  }, []);

  const sortedResults = useMemo(
    () => sortResults(results ?? [], state.sort),
    [results, state.sort],
  );

  const favoriteUrls = useMemo(
    () => new Set(favorites.map((item) => item.url)),
    [favorites],
  );

  const activeFilterCount = countActiveFilters(state);
  const showHome = results === null && !loading && error === null;
  const activeResult =
    activeIndex >= 0 ? sortedResults[activeIndex] : undefined;

  useEffect(() => {
    if (activeIndex < 0) return;
    document
      .getElementById(`result-${activeIndex}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleEscape = useCallback(() => {
    if (panel) {
      setPanel(null);
      return;
    }
    if (filtersOpen) {
      setFiltersOpen(false);
      return;
    }
    if (activeIndex >= 0) {
      setActiveIndex(-1);
      return;
    }
    if (document.activeElement === inputRef.current) {
      inputRef.current?.blur();
    }
  }, [panel, filtersOpen, activeIndex]);

  useHotkeys({
    onFocusSearch: () => inputRef.current?.focus(),
    onEscape: handleEscape,
    onNext: () =>
      setActiveIndex((index) =>
        Math.min(sortedResults.length - 1, index + 1),
      ),
    onPrev: () => setActiveIndex((index) => Math.max(0, index - 1)),
    onOpen: () => {
      if (activeResult) {
        window.open(activeResult.url, "_blank", "noopener,noreferrer");
      }
    },
    onToggleFavorite: () => {
      if (activeResult) toggleFavorite(activeResult);
    },
    onHelp: () => setPanel("shortcuts"),
  });

  async function copyQuery() {
    if (!meta) return;
    try {
      await navigator.clipboard.writeText(meta.query);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard permissions may be denied; no need to interrupt the user.
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
      <main className="flex-1">
        {showHome ? (
          <section className="mx-auto flex w-full max-w-3xl flex-col px-4 pb-16 pt-[10vh] sm:pt-[14vh]">
            <div className="text-center">
              <span className="chip mx-auto border-accent/20 bg-accent-soft text-accent">
                <Sparkles size={12} />
                DeepSeek Search API
              </span>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
                搜得更准，看得更清
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted sm:text-base">
                实时网页搜索，按相关度、权威性与时效性排序。支持站点、语言与日期筛选。
              </p>
            </div>

            <div className="mt-8">
              <SearchBar
                value={state.keywords}
                onChange={(keywords) => updateState({ keywords })}
                onSubmit={submit}
                inputRef={inputRef}
                pending={loading}
                size="hero"
              />
            </div>

            {hydrated && history.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-muted">最近：</span>
                {history.slice(0, 4).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => runHistoryItem(item)}
                    className="chip max-w-[12rem] hover:border-accent/30 hover:text-accent"
                  >
                    <span className="truncate">
                      {item.state.keywords.trim() ||
                        item.query ||
                        "筛选搜索"}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setPanel("history")}
                className="btn btn-ghost h-8 text-xs"
              >
                <History size={14} />
                搜索历史
                {history.length > 0 ? (
                  <span className="text-[10px] text-muted">
                    {history.length}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setPanel("favorites")}
                className="btn btn-ghost h-8 text-xs"
              >
                <Star size={14} />
                我的收藏
                {favorites.length > 0 ? (
                  <span className="text-[10px] text-muted">
                    {favorites.length}
                  </span>
                ) : null}
              </button>
            </div>

            <div className="mt-12 grid gap-2 sm:grid-cols-2">
              {SYNTAX_EXAMPLES.map((example) => (
                <button
                  key={example.code}
                  type="button"
                  onClick={() => {
                    updateState({
                      keywords: state.keywords
                        ? `${state.keywords.trim()} ${example.code}`
                        : example.code,
                    });
                    inputRef.current?.focus();
                  }}
                  className="surface-card flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:border-accent/30 hover:bg-surface-hover"
                >
                  <code className="min-w-0 truncate text-xs text-foreground/80">
                    {example.code}
                  </code>
                  <span className="shrink-0 text-[11px] text-muted">
                    {example.label}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-8 text-center text-[11px] leading-5 text-muted">
              按 <kbd className="kbd">/</kbd> 聚焦搜索 ·{" "}
              <kbd className="kbd">Enter</kbd> 搜索 ·{" "}
              <kbd className="kbd">?</kbd> 查看快捷键
            </p>
          </section>
        ) : (
          <section className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6">
            <div className="sticky top-14 z-20 -mx-4 border-b border-transparent bg-background/85 px-4 pb-2 pt-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
              <SearchBar
                value={state.keywords}
                onChange={(keywords) => updateState({ keywords })}
                onSubmit={submit}
                inputRef={inputRef}
                pending={loading}
              />

              <div className="mt-2.5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setFiltersOpen((open) => !open)}
                  aria-expanded={filtersOpen}
                  className={cn(
                    "btn h-8 px-2.5 text-xs",
                    filtersOpen &&
                      "border-accent/30 bg-accent-soft text-accent",
                  )}
                >
                  <SlidersHorizontal size={14} />
                  高级筛选
                  {activeFilterCount > 0 ? (
                    <span className="grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-4 text-white">
                      {activeFilterCount}
                    </span>
                  ) : null}
                  <ChevronDown
                    size={13}
                    className={cn(
                      "transition-transform",
                      filtersOpen && "rotate-180",
                    )}
                  />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setPanel("history")}
                    className="btn btn-ghost h-8 px-2 text-xs"
                    aria-label="搜索历史"
                    title="搜索历史"
                  >
                    <History size={15} />
                    <span className="hidden sm:inline">历史</span>
                    {history.length > 0 ? (
                      <span className="text-[10px] text-muted">
                        {history.length}
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanel("favorites")}
                    className="btn btn-ghost h-8 px-2 text-xs"
                    aria-label="我的收藏"
                    title="我的收藏"
                  >
                    <Star size={15} />
                    <span className="hidden sm:inline">收藏</span>
                    {favorites.length > 0 ? (
                      <span className="text-[10px] text-muted">
                        {favorites.length}
                      </span>
                    ) : null}
                  </button>
                </div>
              </div>
            </div>

            {filtersOpen ? (
              <AdvancedFilters
                state={state}
                onChange={updateState}
                onReset={resetFilters}
              />
            ) : null}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
              <span className="tabular-nums">
                {loading
                  ? "正在搜索…"
                  : meta
                    ? `${sortedResults.length} 条结果 · ${formatElapsed(meta.elapsedMs)}${meta.cached ? " · 命中缓存" : ""}`
                    : ""}
              </span>

              {meta ? (
                <div className="flex items-center gap-1.5">
                  <label className="flex items-center gap-1.5">
                    <span className="sr-only">排序方式</span>
                    <select
                      value={state.sort}
                      onChange={(event) =>
                        changeSort(event.target.value as SortMode)
                      }
                      className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-accent/50"
                    >
                      <option value="relevance">相关度</option>
                      <option value="newest">最新</option>
                      <option value="authority">权威度</option>
                    </select>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="sr-only">返回结果数量</span>
                    <select
                      value={state.count}
                      onChange={(event) =>
                        changeCount(Number(event.target.value))
                      }
                      title="更改条数会重新发起一次搜索"
                      className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-foreground outline-none focus:border-accent/50"
                    >
                      {COUNT_OPTIONS.map((count) => (
                        <option key={count} value={count}>
                          {count} 条
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}
            </div>

            {meta ? (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                <span className="mt-0.5 shrink-0 text-[11px] font-medium text-muted">
                  实际查询
                </span>
                <code className="min-w-0 flex-1 break-all text-xs leading-5 text-foreground/80">
                  {meta.query}
                </code>
                <button
                  type="button"
                  onClick={copyQuery}
                  className="grid size-6 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
                  aria-label="复制查询语句"
                  title="复制查询语句"
                >
                  {copied ? (
                    <Check size={13} className="text-success" />
                  ) : (
                    <Copy size={13} />
                  )}
                </button>
              </div>
            ) : null}

            <div className="mt-4">
              <ResultsList
                results={sortedResults}
                loading={loading}
                error={error}
                activeIndex={activeIndex}
                favoriteUrls={favoriteUrls}
                onToggleFavorite={toggleFavorite}
                onRetry={() => runSearch(state)}
                onClearFilters={clearFiltersAndSearch}
                hasFilters={activeFilterCount > 0}
              />
            </div>

            {sortedResults.length > 0 ? (
              <p className="mt-6 flex flex-wrap items-center justify-center gap-1.5 text-[11px] text-muted">
                <CornerDownLeft size={12} />
                按 <kbd className="kbd">j</kbd>
                <kbd className="kbd">k</kbd> 选择结果，
                <kbd className="kbd">Enter</kbd> 打开，
                <kbd className="kbd">f</kbd> 收藏
              </p>
            ) : null}
          </section>
        )}
      </main>

      <footer className="border-t border-border/60 px-4 py-6 text-center text-[11px] leading-5 text-muted">
        <p>
          由{" "}
          <a
            href="https://api-docs.deepseek.com/zh-cn/guides/search/"
            target="_blank"
            rel="noreferrer"
            className="text-accent hover:underline"
          >
            DeepSeek Search API
          </a>{" "}
          提供 · 结果来自第三方网页，请注意甄别
        </p>
        <p className="mt-1">
          每次成功搜索都会产生 API 费用 · 历史与收藏仅保存在本机浏览器
        </p>
      </footer>

      <HistoryPanel
        open={panel === "history"}
        onClose={() => setPanel(null)}
        items={history}
        hydrated={hydrated}
        onRun={runHistoryItem}
        onRemove={removeHistory}
        onClear={clearHistory}
        onExport={exportBackup}
        onImport={importBackup}
        backupStatus={backupStatus}
      />
      <FavoritesPanel
        open={panel === "favorites"}
        onClose={() => setPanel(null)}
        items={favorites}
        hydrated={hydrated}
        onRemove={removeFavorite}
        onClear={clearFavorites}
        onExport={exportBackup}
        onImport={importBackup}
        backupStatus={backupStatus}
      />
      <ShortcutsDialog
        open={panel === "shortcuts"}
        onClose={() => setPanel(null)}
      />
    </div>
  );
}
