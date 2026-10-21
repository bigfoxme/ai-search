"use client";

import { useEffect, useRef } from "react";

export interface HotkeyHandlers {
  onFocusSearch: () => void;
  onEscape: () => void;
  onNext: () => void;
  onPrev: () => void;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onHelp: () => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useHotkeys(handlers: HotkeyHandlers): void {
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // Chinese IME composition must never trigger navigation shortcuts.
      if (event.isComposing || event.keyCode === 229) return;

      const editable = isEditableTarget(event.target);

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        handlersRef.current.onFocusSearch();
        return;
      }

      if (event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "Escape") {
        handlersRef.current.onEscape();
        return;
      }

      if (event.key === "/" && !editable) {
        event.preventDefault();
        handlersRef.current.onFocusSearch();
        return;
      }

      if (event.key === "?" && !editable) {
        event.preventDefault();
        handlersRef.current.onHelp();
        return;
      }

      if (editable) return;

      switch (event.key) {
        case "j":
          event.preventDefault();
          handlersRef.current.onNext();
          break;
        case "k":
          event.preventDefault();
          handlersRef.current.onPrev();
          break;
        case "f":
          event.preventDefault();
          handlersRef.current.onToggleFavorite();
          break;
        case "Enter":
          event.preventDefault();
          handlersRef.current.onOpen();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
