"use client";

import { BookOpen, LogOut, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "./theme-toggle";

export function SiteHeader({ showLogout = false }: { showLogout?: boolean }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-accent text-white shadow-sm shadow-accent/20">
            <Search size={17} strokeWidth={2.6} />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            DeepSeek 搜索
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <a
            href="https://api-docs.deepseek.com/zh-cn/guides/search/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost hidden h-9 px-2.5 text-xs sm:inline-flex"
          >
            <BookOpen size={15} />
            API 文档
          </a>
          <ThemeToggle />
          {showLogout ? (
            <button
              type="button"
              onClick={logout}
              disabled={loggingOut}
              className="btn btn-ghost h-9 px-2.5 text-xs"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">退出</span>
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
