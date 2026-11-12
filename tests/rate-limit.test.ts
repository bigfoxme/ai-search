import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/rate-limit";

describe("getClientIp", () => {
  it("prefers CF-Connecting-IP over X-Forwarded-For when trusted", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "1.2.3.4, 5.6.7.8",
      "x-real-ip": "9.9.9.9",
    });
    expect(getClientIp(headers, true)).toBe("203.0.113.9");
  });

  it("ignores a client-supplied CF-Connecting-IP when not trusted", () => {
    const headers = new Headers({
      "cf-connecting-ip": "203.0.113.9",
      "x-forwarded-for": "198.51.100.7",
    });
    expect(getClientIp(headers, false)).toBe("198.51.100.7");
  });

  it("falls back to the first X-Forwarded-For entry", () => {
    const headers = new Headers({
      "x-forwarded-for": " 198.51.100.7 , 198.51.100.8",
    });
    expect(getClientIp(headers)).toBe("198.51.100.7");
  });

  it("falls back to X-Real-IP", () => {
    expect(getClientIp(new Headers({ "x-real-ip": "192.0.2.5" }))).toBe(
      "192.0.2.5",
    );
  });

  it("returns local when no address header is present", () => {
    expect(getClientIp(new Headers())).toBe("local");
  });
});
