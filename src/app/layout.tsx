import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "DeepSeek 搜索",
    template: "%s · DeepSeek 搜索",
  },
  description:
    "调用 DeepSeek Search API 的轻量搜索站，支持高级筛选、搜索历史、收藏与深色模式。",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f15" },
  ],
};

// Runs before first paint. writeTheme stores JSON, but older/plain values are
// accepted too, so the first frame matches what ThemeToggle will apply.
const themeScript = `(function(){try{var raw=localStorage.getItem("ds:theme");try{raw=raw?JSON.parse(raw):null}catch(e){}var mode=(raw==="light"||raw==="dark"||raw==="system")?raw:"system";var dark=mode==="dark"||(mode==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var root=document.documentElement;root.classList.toggle("dark",dark);root.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
