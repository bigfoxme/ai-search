"use client";

import { Loader2, Search, X } from "lucide-react";
import type { RefObject } from "react";
import { cn } from "@/lib/cn";

export function SearchBar({
  value,
  onChange,
  onSubmit,
  inputRef,
  pending = false,
  size = "compact",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  inputRef: RefObject<HTMLInputElement | null>;
  pending?: boolean;
  size?: "hero" | "compact";
}) {
  const hero = size === "hero";

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border bg-surface shadow-sm transition-all focus-within:border-accent/50 focus-within:shadow-md focus-within:ring-4 focus-within:ring-accent/10",
        hero ? "h-14 px-4" : "h-12 px-3",
      )}
    >
      <Search
        size={hero ? 20 : 17}
        className="shrink-0 text-muted"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          // Keep Enter from submitting while a Chinese IME is composing.
          if (event.key === "Enter" && event.nativeEvent.isComposing) {
            event.preventDefault();
          }
        }}
        placeholder="搜索任何内容…"
        aria-label="搜索关键词"
        autoComplete="off"
        spellCheck={false}
        className={cn(
          "h-full min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted/60 [&::-webkit-search-cancel-button]:hidden",
          hero ? "text-base" : "text-sm",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          aria-label="清空搜索框"
        >
          <X size={15} />
        </button>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className={cn(
          "btn btn-primary shrink-0",
          hero ? "h-10 px-5" : "h-8 px-3 text-xs",
        )}
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : null}
        <span>{pending ? "搜索中" : "搜索"}</span>
      </button>
    </form>
  );
}
