import { cookies } from "next/headers";
import { Suspense } from "react";
import { SearchApp } from "@/components/search-app";
import { SiteHeader } from "@/components/site-header";
import { AUTH_COOKIE, authEnabled, isAuthedCookie } from "@/lib/auth";

// Cookies and ACCESS_PASSWORD must be evaluated per request, not at build time.
export const dynamic = "force-dynamic";

function SearchFallback() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-[14vh]">
      <div className="mx-auto h-6 w-44 animate-pulse rounded-full bg-surface-muted" />
      <div className="mx-auto mt-5 h-9 w-72 max-w-full animate-pulse rounded-lg bg-surface-muted" />
      <div className="mt-8 h-14 animate-pulse rounded-2xl bg-surface-muted" />
    </div>
  );
}

export default async function HomePage() {
  const showLogout =
    authEnabled() &&
    isAuthedCookie((await cookies()).get(AUTH_COOKIE)?.value);

  return (
    <div className="min-h-dvh">
      <SiteHeader showLogout={showLogout} />
      <Suspense fallback={<SearchFallback />}>
        <SearchApp />
      </Suspense>
    </div>
  );
}
