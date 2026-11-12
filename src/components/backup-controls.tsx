"use client";

import { Download, Upload } from "lucide-react";
import { useRef } from "react";
import type { BackupStatus } from "@/lib/backup";

export function BackupControls({
  onExport,
  onImport,
  disabled = false,
  status,
}: {
  onExport: () => void;
  onImport: (file: File) => void;
  disabled?: boolean;
  status: BackupStatus | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onExport}
          disabled={disabled}
          className="btn btn-ghost h-8 text-xs"
        >
          <Download size={13} />
          导出备份
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="btn btn-ghost h-8 text-xs"
        >
          <Upload size={13} />
          导入备份
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.target.value = "";
        }}
      />
      <p className="text-[11px] leading-5 text-muted">
        备份包含搜索历史与收藏，导入时会与当前数据合并。
      </p>
      {status ? (
        <p
          role="status"
          className={
            status.kind === "error"
              ? "text-[11px] leading-5 text-warning"
              : "text-[11px] leading-5 text-success"
          }
        >
          {status.text}
        </p>
      ) : null}
    </div>
  );
}
