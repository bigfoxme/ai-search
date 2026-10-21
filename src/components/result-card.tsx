"use client";

import {
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import {
  formatDate,
  formatDateTime,
  hostnameOf,
  initialOf,
} from "@/lib/format";
import type { SearchResult } from "@/lib/types";
import { Badge } from "./ui/badge";

function SiteIcon({
  icon,
  name,
}: {
  icon: string | null;
  name: string;
}) {
  const [status, setStatus] = useState<"loading" | "ok" | "failed">("loading");

  if (!icon || status === "failed") {
    return (
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-xs font-semibold text-accent"
      >
        {initialOf(name)}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className="relative grid size-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-accent-soft text-xs font-semibold text-accent"
    >
      {initialOf(name)}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={icon}
        alt=""
        width={32}
        height={32}
        referrerPolicy="no-referrer"
        onLoad={() => setStatus("ok")}
        onError={() => setStatus("failed")}
        className={cn(
          "absolute inset-0 size-8 rounded-lg object-contain transition-opacity",
          status === "ok" ? "opacity-100" : "opacity-0",
        )}
      />
    </span>
  );
}

export function ResultCard({
  result,
  index,
  active,
  favorite,
  onToggleFavorite,
}: {
  result: SearchResult;
  index: number;
  active: boolean;
  favorite: boolean;
  onToggleFavorite: (result: SearchResult) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const host = hostnameOf(result.url);
  const siteName = result.site_name || host || "未知站点";
  const date = formatDate(result.date);
  const highQuality = result.rerank_score >= 1.5;
  const authoritative = result.authority >= 3;

  return (
    <article
      id={`result-${index}`}
      className={cn(
        "surface-card group p-4 transition-all sm:p-5",
        active
          ? "border-accent/50 ring-2 ring-accent/15"
          : "hover:border-border/80 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <SiteIcon icon={result.site_icon} name={siteName} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
            <span className="font-medium text-foreground/75">{siteName}</span>
            {date ? (
              <>
                <span aria-hidden>·</span>
                <time
                  dateTime={result.date ?? undefined}
                  title={formatDateTime(result.date)}
                >
                  {date}
                </time>
              </>
            ) : null}
            {authoritative ? (
              <Badge
                tone="success"
                title={`权威性 ${result.authority} / 4`}
              >
                <ShieldCheck size={11} />
                权威
              </Badge>
            ) : null}
            {highQuality ? (
              <Badge
                tone="accent"
                title={`相关度 ${result.rerank_score.toFixed(2)} / 3`}
              >
                <Sparkles size={11} />
                优质
              </Badge>
            ) : null}
          </div>

          <h3 className="mt-1.5 text-[15px] font-semibold leading-6 tracking-tight sm:text-base">
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="decoration-accent/40 underline-offset-4 transition-colors hover:text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            >
              {result.title}
            </a>
          </h3>

          {result.snippet ? (
            <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-muted">
              {result.snippet}
            </p>
          ) : null}

          {expanded && result.summary ? (
            <p className="mt-2 rounded-xl bg-surface-muted/70 px-3 py-2.5 text-sm leading-6 text-muted">
              {result.summary}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            {result.summary ? (
              <button
                type="button"
                onClick={() => setExpanded((value) => !value)}
                className="inline-flex items-center gap-0.5 font-medium text-accent transition-opacity hover:opacity-80"
                aria-expanded={expanded}
              >
                {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                {expanded ? "收起摘要" : "展开摘要"}
              </button>
            ) : null}

            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-muted transition-colors hover:text-foreground"
            >
              {host || "打开网页"}
              <ArrowUpRight size={13} />
            </a>

            <button
              type="button"
              onClick={() => onToggleFavorite(result)}
              aria-pressed={favorite}
              className={cn(
                "ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-colors",
                favorite
                  ? "border-accent/30 bg-accent-soft text-accent"
                  : "border-transparent text-muted hover:bg-surface-hover hover:text-foreground",
              )}
            >
              <Star
                size={12}
                className={favorite ? "fill-current" : undefined}
              />
              {favorite ? "已收藏" : "收藏"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
