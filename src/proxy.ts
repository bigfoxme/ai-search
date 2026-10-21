import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authEnabled, isAuthedCookie } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/health"]);

export function proxy(request: NextRequest) {
  if (!authEnabled()) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (isAuthedCookie(token)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "请先登录后再搜索。" } },
      { status: 401 },
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Skip Next.js assets and any request for a file with an extension.
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
