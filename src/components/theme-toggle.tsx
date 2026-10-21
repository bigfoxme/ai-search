"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import {
  getServerThemeSnapshot,
  getThemeSnapshot,
  subscribeTheme,
  writeTheme,
  type ThemeMode,
} from "@/lib/storage";

const ORDER: ThemeMode[] = ["system", "light", "dark"];

export function ThemeToggle() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    getThemeSnapshot,
    getServerThemeSnapshot,
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      const root = document.documentElement;
      root.classList.toggle("dark", dark);
      root.style.colorScheme = dark ? "dark" : "light";
    };

    apply();
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme]);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    writeTheme(next);
  }

  const label =
    theme === "light" ? "浅色" : theme === "dark" ? "深色" : "跟随系统";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;

  return (
    <button
      type="button"
      onClick={cycle}
      className="btn btn-ghost size-9 p-0"
      aria-label={`主题：${label}，点击切换`}
      title={`主题：${label}（点击切换）`}
    >
      <Icon size={17} />
    </button>
  );
}
