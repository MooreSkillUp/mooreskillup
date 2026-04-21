"use client";

import Link from "next/link";
import { Clock3 } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";

export function ComingSoonPanel({
  title,
  body,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: {
  title: string;
  body: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Clock3 className="h-6 w-6" />
      </div>
      <div className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
        Coming soon
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-muted-foreground">{body}</p>
      <Link href={backHref} className="mt-6 inline-flex">
        <Button variant="accent">{backLabel}</Button>
      </Link>
    </div>
  );
}
