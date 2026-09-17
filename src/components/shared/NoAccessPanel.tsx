"use client";

import { Lock } from "lucide-react";

/**
 * Shown instead of a page an admin tier cannot open.
 *
 * These pages used to render their normal empty state — "0 students", "No
 * teachers yet", "Revenue ₦0" — because the data fetch is skipped when the
 * permission is missing. Nothing leaked, but the screen stated things that were
 * not true and offered actions that would be refused. Saying "you do not have
 * access" is both honest and shorter.
 */
export function NoAccessPanel({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {detail ?? "Ask a Super Admin if you need this."}
      </p>
    </div>
  );
}
