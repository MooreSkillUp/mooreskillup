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
  mobileSheet = false,
  className,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
  /**
   * On phones, pin the panel across the viewport instead of anchoring it to the
   * trigger.
   *
   * A wide panel anchored to a button that isn't the rightmost one extends
   * leftwards past the edge of a narrow screen — which is exactly what the
   * notification panel did, since the bell sits inboard of the avatar. Anything
   * wider than a couple of menu items wants this.
   */
  mobileSheet?: boolean;
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
        // Below sm, span the viewport with a small inset and sit clear of the
        // sticky header and the notch, rather than hanging off the trigger.
        mobileSheet &&
          "max-sm:fixed max-sm:left-3 max-sm:right-3 max-sm:w-auto max-sm:top-[calc(env(safe-area-inset-top)+4.25rem)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
