import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "success" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "border-border bg-surface-muted text-muted",
  accent: "border-accent/20 bg-accent-soft text-accent",
  success: "border-success/20 bg-success-soft text-success",
  warning: "border-warning/20 bg-warning-soft text-warning",
};

export function Badge({
  children,
  tone = "neutral",
  title,
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  title?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
