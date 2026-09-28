"use client";

import { useEffect, useRef, useState } from "react";

/**
 * How far through a text lesson you are.
 *
 * A video lesson has a scrub bar, so a student always knows whether they are
 * two minutes or ten from the end. A text lesson had nothing — you scrolled,
 * and the only way to find out how much was left was to keep scrolling. On a
 * phone, where a lesson is several screens, that is the difference between
 * "nearly done, finish it" and "I have no idea how long this is, I'll come
 * back later". They do not come back.
 *
 * Measured against the content element rather than the page, so the header,
 * the navigation card and everything after the lesson do not count towards
 * being finished.
 */
export function ReadingProgress({ targetRef }: { targetRef: React.RefObject<HTMLElement | null> }) {
  const [percent, setPercent] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const element = targetRef.current;
    if (!element) return;

    const measure = () => {
      frame.current = null;
      const rect = element.getBoundingClientRect();
      const viewport = window.innerHeight;

      // How much of the article has passed the bottom of the screen, against
      // how much of it can scroll past at all. A lesson shorter than the
      // screen is complete as soon as it is visible.
      const scrollable = rect.height - viewport;
      if (scrollable <= 0) {
        setPercent(rect.top < viewport ? 100 : 0);
        return;
      }
      const scrolled = Math.min(Math.max(-rect.top, 0), scrollable);
      setPercent(Math.round((scrolled / scrollable) * 100));
    };

    const onScroll = () => {
      // One measurement per frame. Reading a rect forces layout, and doing it
      // on every scroll event makes a long lesson stutter on a cheap phone.
      if (frame.current === null) frame.current = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    };
  }, [targetRef]);

  return (
    <div
      className="sticky top-0 z-20 -mx-6 -mt-6 mb-4 h-1 overflow-hidden rounded-t-[1.5rem] bg-muted"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="How far through this lesson you are"
    >
      <div
        className="h-full bg-primary transition-[width] duration-150 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

/** "6 min read", or nothing when we have no figure worth showing. */
export function readingTime(minutes: number | undefined | null): string {
  if (!minutes || minutes < 1) return "";
  return `${minutes} min read`;
}
