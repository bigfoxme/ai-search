import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { SiteHeader } from "@/components/site-header";
import { AUTH_COOKIE, authEnabled, isAuthedCookie } from "@/lib/auth";

export const metadata: Metadata = {
  title: "登录",
};

// ACCESS_PASSWORD is read at request time so the same build works in any env.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const enabled = authEnabled();

  if (enabled) {
    const token = (await cookies()).get(AUTH_COOKIE)?.value;
    if (isAuthedCookie(token)) redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <div className="surface-card p-6 sm:p-7">
            <h1 className="text-lg font-semibold tracking-tight">
              {enabled ? "请输入访问密码" : "访问保护未启用"}
            </h1>
            <p className="mt-1 text-sm leading-6 text-muted">
              {enabled
                ? "该搜索站已设置访问密码，验证通过后即可使用。"
                : "服务器未设置 ACCESS_PASSWORD，任何人都可以访问。若部署到公网，请务必设置该环境变量。"}
            </p>

            {enabled ? (
              <Suspense
                fallback={<div className="mt-5 h-24 animate-pulse rounded-xl bg-surface-muted" />}
              >
                <LoginForm />
              </Suspense>
            ) : (
              <Link href="/" className="btn btn-primary mt-5 h-10 w-full">
                进入搜索
              </Link>
            )}
          </div>

          <p className="mt-4 text-center text-[11px] leading-5 text-muted">
            密码仅用于换取本机访问 Cookie，不会发送给搜索服务。
          </p>
        </div>
      </main>
    </div>
  );
}
