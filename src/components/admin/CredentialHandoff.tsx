"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui-kit/Button";

export type Handoff = { email: string; password: string; context: string };

/**
 * A temporary password the admin has to pass on by hand.
 *
 * Shown once, and only when email couldn't carry it. Production had never sent
 * an email, so "we've emailed their sign-in details" was a sentence the old
 * screens printed while the password went nowhere — or, on resend, was reset
 * and handed to nobody, locking the person out.
 */
export function CredentialHandoff({ handoff, onDone }: { handoff: Handoff; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Email: ${handoff.email}\nTemporary password: ${handoff.password}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="rounded-2xl border border-warning/40 bg-warning/10 p-5" aria-live="polite">
      <h2 className="font-display text-base font-semibold">Pass these sign-in details on</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {handoff.context} Email isn&apos;t being delivered, so this is the only copy — it won&apos;t be
        shown again. They&apos;ll be asked to choose their own password when they sign in.
      </p>
      <dl className="mt-4 grid gap-2 rounded-xl border border-border bg-card p-4 text-sm sm:grid-cols-[auto_1fr]">
        <dt className="text-muted-foreground">Email</dt>
        <dd className="font-medium">{handoff.email}</dd>
        <dt className="text-muted-foreground">Temporary password</dt>
        <dd>
          <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">{handoff.password}</code>
        </dd>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void copy()}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy both"}
        </Button>
        <Button variant="accent" size="sm" onClick={onDone}>
          I&apos;ve passed it on
        </Button>
      </div>
    </section>
  );
}
