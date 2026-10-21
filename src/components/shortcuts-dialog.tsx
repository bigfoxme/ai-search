"use client";

import { Modal } from "./ui/modal";

const SHORTCUTS: Array<{ keys: string[]; label: string }> = [
  { keys: ["/"], label: "聚焦搜索框" },
  { keys: ["Ctrl", "K"], label: "聚焦搜索框（Windows / Linux）" },
  { keys: ["⌘", "K"], label: "聚焦搜索框（macOS）" },
  { keys: ["Enter"], label: "提交搜索；在结果中打开当前项" },
  { keys: ["Esc"], label: "关闭面板 / 清除选中 / 取消聚焦" },
  { keys: ["j"], label: "选中下一条结果" },
  { keys: ["k"], label: "选中上一条结果" },
  { keys: ["f"], label: "收藏 / 取消收藏当前结果" },
  { keys: ["?"], label: "打开本说明" },
];

export function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="键盘快捷键">
      <ul className="space-y-2">
        {SHORTCUTS.map((shortcut) => (
          <li
            key={shortcut.label}
            className="flex items-center justify-between gap-4 text-sm"
          >
            <span className="text-muted">{shortcut.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {shortcut.keys.map((key) => (
                <kbd key={key} className="kbd">
                  {key}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 rounded-xl bg-surface-muted/70 px-3 py-2 text-[11px] leading-5 text-muted">
        在输入框内输入时，j / k / f 不会触发；中文输入法拼写过程中也不会误触快捷键。
      </p>
    </Modal>
  );
}
