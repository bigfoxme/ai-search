import { afterEach, describe, expect, it } from "vitest";
import {
  accessToken,
  authEnabled,
  isAuthedCookie,
  verifyPassword,
} from "@/lib/auth";
import { safeNextPath } from "@/lib/next-path";

const originalPassword = process.env.ACCESS_PASSWORD;

afterEach(() => {
  if (originalPassword === undefined) {
    delete process.env.ACCESS_PASSWORD;
  } else {
    process.env.ACCESS_PASSWORD = originalPassword;
  }
});

describe("auth", () => {
  it("is disabled when ACCESS_PASSWORD is unset", () => {
    delete process.env.ACCESS_PASSWORD;
    expect(authEnabled()).toBe(false);
    expect(isAuthedCookie(undefined)).toBe(true);
    expect(verifyPassword("anything")).toBe(true);
  });

  it("accepts only the derived token when enabled", () => {
    process.env.ACCESS_PASSWORD = "secret";
    expect(authEnabled()).toBe(true);
    expect(isAuthedCookie(accessToken())).toBe(true);
    expect(isAuthedCookie("wrong")).toBe(false);
    expect(isAuthedCookie(undefined)).toBe(false);
  });

  it("verifies the password and changes the token with it", () => {
    process.env.ACCESS_PASSWORD = "first";
    const firstToken = accessToken();
    expect(verifyPassword("first")).toBe(true);
    expect(verifyPassword("second")).toBe(false);

    process.env.ACCESS_PASSWORD = "second";
    expect(accessToken()).not.toBe(firstToken);
    expect(isAuthedCookie(firstToken)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps same-origin paths", () => {
    expect(safeNextPath("/?q=test")).toBe("/?q=test");
    expect(safeNextPath("/?q=test#top")).toBe("/?q=test#top");
  });

  it("never returns to the login page", () => {
    expect(safeNextPath("/login?next=%2F")).toBe("/");
    expect(safeNextPath("/login")).toBe("/");
  });

  it("rejects external and protocol-relative destinations", () => {
    expect(safeNextPath("https://evil.com")).toBe("/");
    expect(safeNextPath("//evil.com")).toBe("/");
    expect(safeNextPath("/\\evil.com")).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
  });
});
