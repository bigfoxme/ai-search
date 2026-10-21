"use client";

import { ExternalLink, Star, Trash2 } from "lucide-react";
import { formatDate, hostnameOf, relativeTime } from "@/lib/format";
import type { FavoriteItem } from "@/lib/storage";
import { Sheet } from "./ui/sheet";

export function FavoritesPanel({
  open,
  onClose,
  items,
  hydrated,
  onRemove,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  items: FavoriteItem[];
  hydrated: boolean;
  onRemove: (url: string) => void;
  onClear: () => void;
}) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="我的收藏"
      description="仅保存在当前浏览器的本地存储中"
      footer={
        items.length > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="btn btn-ghost h-8 w-full text-xs text-warning"
          >
            <Trash2 size={13} />
            清空全部收藏
          </button>
        ) : null
      }
    >
      {!hydrated ? (
        <p className="text-sm text-muted">加载中…</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center py-14 text-center">
          <span className="grid size-11 place-items-center rounded-full bg-surface-muted text-muted">
            <Star size={19} />
          </span>
          <p className="mt-3 text-sm text-muted">还没有收藏任何结果。</p>
          <p className="mt-1 text-xs text-muted">
            在结果卡片右下角点击「收藏」即可保存。
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.url}
              className="group rounded-xl border border-border p-3 transition-colors hover:bg-surface-hover"
            >
              <div className="flex items-start justify-between gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 text-sm font-medium leading-5 hover:text-accent"
                >
                  <span className="line-clamp-2">{item.title}</span>
                </a>
                <button
                  type="button"
                  onClick={() => onRemove(item.url)}
                  aria-label={`取消收藏：${item.title}`}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-0 transition-opacity hover:bg-surface hover:text-warning focus-visible:opacity-100 group-hover:opacity-100"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">
                {item.snippet}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                <span>{item.siteName || hostnameOf(item.url)}</span>
                {item.date ? <span>· {formatDate(item.date)}</span> : null}
                <span>· 收藏于 {relativeTime(item.savedAt)}</span>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-0.5 hover:text-accent"
                >
                  打开
                  <ExternalLink size={11} />
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
