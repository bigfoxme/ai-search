"use client";

import { Clock3, Trash2 } from "lucide-react";
import { relativeTime } from "@/lib/format";
import type { HistoryItem } from "@/lib/storage";
import type { SearchState } from "@/lib/types";
import { Sheet } from "./ui/sheet";

function summarize(state: SearchState): string[] {
  const parts: string[] = [];
  if (state.phrase) parts.push(`"${state.phrase}"`);
  if (state.sites) parts.push(`站点 ${state.sites}`);
  if (state.excludeSites) parts.push(`排除 ${state.excludeSites}`);
  if (state.langs) parts.push(`语言 ${state.langs}`);
  if (state.after) parts.push(`≥ ${state.after}`);
  if (state.before) parts.push(`≤ ${state.before}`);
  if (state.excludeTerms) parts.push(`排除词 ${state.excludeTerms}`);
  return parts;
}

export function HistoryPanel({
  open,
  onClose,
  items,
  hydrated,
  onRun,
  onRemove,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  items: HistoryItem[];
  hydrated: boolean;
  onRun: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="搜索历史"
      description="仅保存在当前浏览器的本地存储中"
      footer={
        items.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="btn btn-ghost h-8 w-full text-xs text-warning"
          >
            <Trash2 size={13} />
            清空全部历史
          </button>
        ) : null
      }
    >
      {!hydrated ? (
        <p className="text-sm text-muted">加载中…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-surface-muted text-muted">
            <Clock3 size={19} />
          </span>
          <p className="mt-3 text-sm text-muted">还没有搜索记录。</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const filters = summarize(item.state);
            const label =
              item.state.keywords.trim() || item.query || "筛选搜索";
            return (
              <li
                key={item.id}
                className="group flex items-start gap-2 rounded-xl border border-border p-2.5 transition-colors hover:bg-surface-hover"
              >
                <button
                  type="button"
                  onClick={() => onRun(item)}
                  className="min-w-0 flex-1 text-left"
                >
                  <span className="block truncate text-sm font-medium">
                    {label}
                  </span>
                  {filters.length > 0 ? (
                    <span className="mt-1 flex flex-wrap gap-1">
                      {filters.map((part) => (
                        <span
                          key={part}
                          className="rounded bg-surface-muted px-1.5 py-0.5 text-[10px] text-muted"
                        >
                          {part}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <span className="mt-1 block text-[11px] text-muted">
                    {item.resultCount} 条结果 · {relativeTime(item.searchedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => onRemove(item.id)}
                  aria-label={`删除记录：${label}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition-opacity hover:bg-surface hover:text-warning focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
