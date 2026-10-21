"use client";

import { Loader2, RotateCcw, SearchX, TriangleAlert } from "lucide-react";
import type { SearchResult } from "@/lib/types";
import { ResultCard } from "./result-card";

function SkeletonList() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="正在搜索">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="surface-card animate-pulse p-4 sm:p-5">
          <div className="flex gap-3">
            <div className="size-8 shrink-0 rounded-lg bg-surface-muted" />
            <div className="flex-1 space-y-2.5">
              <div className="h-3 w-40 rounded bg-surface-muted" />
              <div className="h-4 w-4/5 rounded bg-surface-muted" />
              <div className="h-3 w-full rounded bg-surface-muted" />
              <div className="h-3 w-2/3 rounded bg-surface-muted" />
            </div>
          </div>
        </div>
      ))}
      <span className="sr-only">正在搜索…</span>
    </div>
  );
}

export function ResultsList({
  results,
  loading,
  error,
  activeIndex,
  favoriteUrls,
  onToggleFavorite,
  onRetry,
  onClearFilters,
  hasFilters,
}: {
  results: SearchResult[];
  loading: boolean;
  error: string | null;
  activeIndex: number;
  favoriteUrls: Set<string>;
  onToggleFavorite: (result: SearchResult) => void;
  onRetry: () => void;
  onClearFilters: () => void;
  hasFilters: boolean;
}) {
  if (loading) return <SkeletonList />;

  if (error) {
    return (
      <div className="surface-card flex flex-col items-center px-6 py-12 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-warning-soft text-warning">
          <TriangleAlert size={20} />
        </span>
        <h3 className="mt-3 text-sm font-semibold">搜索失败</h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted">{error}</p>
        <button type="button" onClick={onRetry} className="btn mt-4 h-9">
          <RotateCcw size={14} />
          重试
        </button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="surface-card flex flex-col items-center px-6 py-14 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-surface-muted text-muted">
          <SearchX size={20} />
        </span>
        <h3 className="mt-3 text-sm font-semibold">没有找到结果</h3>
        <p className="mt-1 max-w-md text-sm leading-6 text-muted">
          试试更换关键词、减少筛选条件，或稍后重试。
        </p>
        {hasFilters ? (
          <button
            type="button"
            onClick={onClearFilters}
            className="btn mt-4 h-9"
          >
            <Loader2 size={14} className="hidden" />
            清除筛选后重试
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {results.map((result, index) => (
        <ResultCard
          key={`${result.url}-${index}`}
          result={result}
          index={index}
          active={index === activeIndex}
          favorite={favoriteUrls.has(result.url)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
