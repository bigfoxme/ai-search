"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeNextPath } from "@/lib/next-path";

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError("请输入访问密码。");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, next }),
      });
      const data = (await response.json().catch(() => null)) as {
        next?: string;
        error?: { message?: string };
      } | null;

      if (!response.ok) {
        setError(data?.error?.message ?? "登录失败，请重试。");
        setPending(false);
        return;
      }

      window.location.assign(safeNextPath(data?.next ?? next));
    } catch {
      setError("网络错误，请重试。");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      <label className="block">
        <span className="text-xs font-medium text-foreground/80">访问密码</span>
        <span className="relative mt-1.5 block">
          <LockKeyhole
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="请输入 ACCESS_PASSWORD"
            autoComplete="current-password"
            autoFocus
            className="field pl-9"
            aria-invalid={Boolean(error)}
          />
        </span>
      </label>

      {error ? (
        <p role="alert" className="text-xs text-warning">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn btn-primary h-10 w-full"
      >
        {pending ? <Loader2 size={15} className="animate-spin" /> : null}
        {pending ? "验证中…" : "进入搜索"}
      </button>
    </form>
  );
}
