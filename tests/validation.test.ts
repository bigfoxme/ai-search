import { describe, expect, it } from "vitest";
import { validateSearchBody } from "@/lib/validation";

describe("validateSearchBody", () => {
  it("accepts a minimal body and applies defaults", () => {
    const result = validateSearchBody({ keywords: "测试" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.state.count).toBe(10);
      expect(result.state.sort).toBe("relevance");
    }
  });

  it("accepts a site-only query", () => {
    const result = validateSearchBody({ sites: "github.com" });
    expect(result.ok).toBe(true);
  });

  it("rejects a body with no query", () => {
    const result = validateSearchBody({ keywords: "   " });
    expect(result).toEqual({
      ok: false,
      message: "请输入搜索关键词或至少一个筛选条件",
    });
  });

  it("rejects non-object bodies", () => {
    expect(validateSearchBody(null).ok).toBe(false);
    expect(validateSearchBody("query").ok).toBe(false);
    expect(validateSearchBody([]).ok).toBe(false);
  });

  it("validates count", () => {
    for (const count of [0, 51, 1.5, "10", Number.NaN]) {
      expect(validateSearchBody({ keywords: "x", count }).ok).toBe(false);
    }
    expect(validateSearchBody({ keywords: "x", count: 50 }).ok).toBe(true);
  });

  it("validates date ranges", () => {
    expect(
      validateSearchBody({ keywords: "x", after: "2025-01-01", before: "2024-01-01" }).ok,
    ).toBe(false);
    expect(validateSearchBody({ keywords: "x", after: "2025-13-01" }).ok).toBe(false);
    expect(
      validateSearchBody({ keywords: "x", after: "2025-01-01", before: "2026-01-01" }).ok,
    ).toBe(true);
  });

  it("rejects invalid sites and languages", () => {
    const sites = validateSearchBody({ keywords: "x", sites: "not a domain" });
    expect(sites.ok).toBe(false);
    if (!sites.ok) expect(sites.message).toContain("站点格式不正确");

    const langs = validateSearchBody({ keywords: "x", langs: "中文!" });
    expect(langs.ok).toBe(false);
    if (!langs.ok) expect(langs.message).toContain("语言代码格式不正确");
  });

  it("rejects composed queries longer than 128 characters", () => {
    const result = validateSearchBody({ keywords: "a".repeat(129) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("超过 128 字符上限");
  });

  it("rejects oversized raw fields", () => {
    expect(validateSearchBody({ keywords: "a".repeat(201) }).ok).toBe(false);
  });

  it("ignores unknown fields", () => {
    const result = validateSearchBody({ keywords: "x", unexpected: true });
    expect(result.ok).toBe(true);
  });
});
