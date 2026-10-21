"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buildQuery,
  countUnicodeChars,
  MAX_QUERY_LENGTH,
  parseLangs,
  parseSites,
} from "@/lib/query-builder";
import type { SearchState } from "@/lib/types";

const QUICK_LANGS = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
] as const;

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium text-foreground/80">{label}</span>
        {hint ? <span className="text-[11px] text-muted">{hint}</span> : null}
      </span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function AdvancedFilters({
  state,
  onChange,
  onReset,
}: {
  state: SearchState;
  onChange: (patch: Partial<SearchState>) => void;
  onReset: () => void;
}) {
  const invalidSites = [
    ...parseSites(state.sites).invalid,
    ...parseSites(state.excludeSites).invalid,
  ];
  const invalidLangs = parseLangs(state.langs).invalid;
  const query = buildQuery(state);
  const length = countUnicodeChars(query);
  const tooLong = length > MAX_QUERY_LENGTH;
  const activeLangs = parseLangs(state.langs).langs;

  function toggleLang(code: string) {
    const next = activeLangs.includes(code)
      ? activeLangs.filter((lang) => lang !== code)
      : [...activeLangs, code];
    onChange({ langs: next.join(",") });
  }

  return (
    <section
      aria-label="高级筛选"
      className="surface-card animate-fade-up mt-3 p-4 sm:p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="精确短语" hint="整句匹配">
          <input
            className="field"
            value={state.phrase}
            onChange={(event) => onChange({ phrase: event.target.value })}
            placeholder="例如：模型发布"
          />
        </Field>
        <Field label="排除词" hint="空格或逗号分隔">
          <input
            className="field"
            value={state.excludeTerms}
            onChange={(event) => onChange({ excludeTerms: event.target.value })}
            placeholder="例如：广告 招聘"
          />
        </Field>
        <Field label="只在这些站点" hint="逗号分隔">
          <input
            className="field"
            value={state.sites}
            onChange={(event) => onChange({ sites: event.target.value })}
            placeholder="github.com, arxiv.org"
          />
        </Field>
        <Field label="排除这些站点" hint="逗号分隔">
          <input
            className="field"
            value={state.excludeSites}
            onChange={(event) => onChange({ excludeSites: event.target.value })}
            placeholder="example.com"
          />
        </Field>
        <Field label="语言" hint="例如 zh,en">
          <div className="space-y-2">
            <input
              className="field"
              value={state.langs}
              onChange={(event) => onChange({ langs: event.target.value })}
              placeholder="zh,en"
            />
            <div className="flex flex-wrap gap-1.5">
              {QUICK_LANGS.map((lang) => {
                const active = activeLangs.includes(lang.code);
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => toggleLang(lang.code)}
                    aria-pressed={active}
                    className={cn("chip", active && "chip-active")}
                  >
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Field>
        <Field label="发布日期范围" hint="UTC">
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="field"
              value={state.after}
              onChange={(event) => onChange({ after: event.target.value })}
              aria-label="起始日期"
            />
            <span className="shrink-0 text-xs text-muted">至</span>
            <input
              type="date"
              className="field"
              value={state.before}
              onChange={(event) => onChange({ before: event.target.value })}
              aria-label="截止日期"
            />
          </div>
        </Field>
      </div>

      {invalidSites.length > 0 || invalidLangs.length > 0 ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-warning">
          <TriangleAlert size={14} className="mt-0.5 shrink-0" />
          <span>
            已忽略格式不正确的值：
            {[...invalidSites, ...invalidLangs].slice(0, 5).join("、")}
          </span>
        </p>
      ) : null}

      <div className="mt-4 rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            最终查询
          </span>
          <span
            className={cn(
              "text-[11px] tabular-nums",
              tooLong ? "font-medium text-red-500" : "text-muted",
            )}
          >
            {length} / {MAX_QUERY_LENGTH}
          </span>
        </div>
        <code className="mt-1 block break-all text-xs leading-5 text-foreground/85">
          {query || "（尚未输入内容）"}
        </code>
        {tooLong ? (
          <p className="mt-1 text-[11px] text-red-500">
            超过 128 字符上限，请精简关键词或筛选条件。
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onReset}
          className="btn btn-ghost h-8 px-2 text-xs"
        >
          <RotateCcw size={13} />
          重置筛选
        </button>
        <span className="text-[11px] text-muted">
          修改后点击上方「搜索」应用
        </span>
      </div>
    </section>
  );
}
