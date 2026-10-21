import { describe, expect, it } from "vitest";
import {
  buildQuery,
  countUnicodeChars,
  isQueryTooLong,
  isValidDateValue,
  normalizeSite,
  parseLangs,
  parseSites,
} from "@/lib/query-builder";
import type { SearchFilters } from "@/lib/types";

const base: SearchFilters = {
  keywords: "",
  phrase: "",
  excludeTerms: "",
  sites: "",
  excludeSites: "",
  langs: "",
  after: "",
  before: "",
};

describe("normalizeSite", () => {
  it("accepts plain hostnames", () => {
    expect(normalizeSite("github.com")).toBe("github.com");
  });

  it("strips protocol, path, port and site: prefix", () => {
    expect(normalizeSite("https://GitHub.com/foo/bar?x=1")).toBe("github.com");
    expect(normalizeSite("site:example.com:8080/path")).toBe("example.com");
    expect(normalizeSite("*.example.com")).toBe("example.com");
  });

  it("rejects invalid hostnames", () => {
    expect(normalizeSite("not a domain")).toBeNull();
    expect(normalizeSite("localhost")).toBeNull();
    expect(normalizeSite("example")).toBeNull();
  });
});

describe("parseSites", () => {
  it("deduplicates and reports invalid tokens", () => {
    expect(parseSites("github.com, https://github.com/foo bad")).toEqual({
      sites: ["github.com"],
      invalid: ["bad"],
    });
  });
});

describe("parseLangs", () => {
  it("normalizes and deduplicates language codes", () => {
    expect(parseLangs("ZH, en, zh-CN")).toEqual({
      langs: ["zh", "en", "zh-cn"],
      invalid: [],
    });
  });

  it("reports invalid codes", () => {
    expect(parseLangs("zh, 中文!").invalid).toEqual(["中文!"]);
  });
});

describe("buildQuery", () => {
  it("returns an empty string for empty filters", () => {
    expect(buildQuery(base)).toBe("");
  });

  it("composes keywords, phrase, excludes, sites, languages and dates", () => {
    const query = buildQuery({
      ...base,
      keywords: "DeepSeek V4",
      phrase: "模型发布",
      excludeTerms: "广告",
      sites: "github.com,huggingface.co",
      excludeSites: "example.com",
      langs: "zh,en",
      after: "2025-01-01",
    });
    expect(query).toBe(
      'DeepSeek V4 "模型发布" -广告 site:github.com OR site:huggingface.co -site:example.com lang:zh,en after:2025-01-01',
    );
  });

  it("quotes multi-word exclude terms", () => {
    expect(
      buildQuery({
        ...base,
        keywords: "ai",
        excludeTerms: '"release notes" "bad phrase"',
      }),
    ).toBe('ai -"release notes" -"bad phrase"');
  });

  it("accepts pre-typed minus signs on exclude terms", () => {
    expect(buildQuery({ ...base, keywords: "ai", excludeTerms: "-广告 -招聘" })).toBe(
      "ai -广告 -招聘",
    );
  });

  it("strips quotes inside an exact phrase", () => {
    expect(buildQuery({ ...base, phrase: 'a "b" c' })).toBe('"a b c"');
  });

  it("normalizes and deduplicates sites", () => {
    expect(
      buildQuery({
        ...base,
        sites: "https://GitHub.com/foo, github.com, www.example.org",
      }),
    ).toBe("site:github.com OR site:www.example.org");
  });

  it("drops invalid sites and dates from the composed query", () => {
    expect(
      buildQuery({
        ...base,
        keywords: "x",
        sites: "not a domain, example.com",
        after: "2025-13-01",
      }),
    ).toBe("x site:example.com");
  });

  it("supports year-only dates", () => {
    expect(buildQuery({ ...base, before: "2026" })).toBe("before:2026");
  });

  it("preserves operators typed directly into keywords", () => {
    expect(buildQuery({ ...base, keywords: 'site:github.com "exact" -x' })).toBe(
      'site:github.com "exact" -x',
    );
  });
});

describe("length helpers", () => {
  it("counts Unicode code points", () => {
    expect(countUnicodeChars("人工智能")).toBe(4);
    expect(countUnicodeChars("🤖")).toBe(1);
  });

  it("detects queries over 128 characters", () => {
    expect(isQueryTooLong("a".repeat(128))).toBe(false);
    expect(isQueryTooLong("a".repeat(129))).toBe(true);
  });

  it("validates date values", () => {
    expect(isValidDateValue("2025")).toBe(true);
    expect(isValidDateValue("2025-01-01")).toBe(true);
    expect(isValidDateValue("2025-02-30")).toBe(false);
    expect(isValidDateValue("2025/01/01")).toBe(false);
  });
});
