"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A popover anchored to the button that opened it.
 *
 * Closes on outside click and on Escape, and returns focus to the trigger — the
 * old notification panel did neither, so it stayed open behind you while you
 * clicked around the page.
 */
export function Dropdown({
  open,
  onClose,
  align = "right",
  className,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
  className?: string;
  labelledBy?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      // The trigger handles its own toggle; ignoring it here stops the click
      // from closing and immediately reopening the panel.
      if ((target as HTMLElement).closest?.("[data-dropdown-trigger]")) return;
      onClose();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="menu"
      aria-labelledby={labelledBy}
      className={cn(
        "absolute top-[calc(100%+0.5rem)] z-50 rounded-2xl border border-border bg-card shadow-xl shadow-black/5",
        "animate-in fade-in slide-in-from-top-1 duration-150",
        align === "right" ? "right-0" : "left-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
