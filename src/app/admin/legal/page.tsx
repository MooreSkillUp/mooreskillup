"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";
import { LegalText } from "@/components/shared/LegalText";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useAuth } from "@/lib/auth";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

/**
 * Where the legal pages are written.
 *
 * Every student agrees to the Terms and the Privacy Policy when they sign up,
 * and their account records which versions. Publishing a change bumps the
 * version, so from that moment new signups are recorded against the new text
 * and everyone before keeps the version they actually saw.
 */
type Kind = "terms" | "privacy" | "refund";

interface LegalDoc {
  kind: Kind;
  title: string;
  body: string;
  version: number;
  publishedAt: string | null;
  updatedAt: string;
  updatedByName: string;
  isPublished: boolean;
}

const HINT = `# Heading
## Smaller heading
A paragraph is plain text. Leave a blank line between paragraphs.
- A bullet point
1. A numbered point`;

export default function AdminLegalPage() {
  const { user } = useAuth();
  const canView = hasUserPermission(user?.permissions, "admin-settings:view");
  const canEdit = hasUserPermission(user?.permissions, "admin-settings:edit");
  const { notifySuccess, notifyError } = useFeedback();

  const [docs, setDocs] = useState<LegalDoc[]>([]);
  const [active, setActive] = useState<Kind>("terms");
  const [draft, setDraft] = useState({ title: "", body: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setDocs(await authenticatedRequest<LegalDoc[]>("/api/admin/legal/"));
    } catch (failure) {
      notifyError("Could not load the documents", failure instanceof Error ? failure.message : "");
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  const current = useMemo(() => docs.find((d) => d.kind === active), [docs, active]);

  useEffect(() => {
    if (current) setDraft({ title: current.title, body: current.body });
  }, [current]);

  const dirty = Boolean(current) && (draft.title !== current!.title || draft.body !== current!.body);

  if (!canView) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel title="You do not have access to the legal pages" />
      </AppShell>
    );
  }

  const publish = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const saved = await authenticatedRequest<LegalDoc>(`/api/admin/legal/${active}/`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      setDocs((all) => all.map((d) => (d.kind === saved.kind ? saved : d)));
      notifySuccess(
        "Published",
        `${saved.title} is now version ${saved.version}. New signups agree to this text.`,
      );
    } catch (failure) {
      notifyError("Could not publish", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const switchTo = (kind: Kind) => {
    if (dirty && !window.confirm("You have unpublished changes. Leave them?")) return;
    setActive(kind);
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Legal pages</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Everyone who signs up agrees to the Terms of Service and the Privacy Policy, and their
            account records which versions. Publishing a change starts a new version; people who
            agreed earlier keep the version they saw.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {docs.map((doc) => (
            <button
              key={doc.kind}
              type="button"
              onClick={() => switchTo(doc.kind)}
              aria-pressed={active === doc.kind}
              className={`rounded-full border px-4 py-2 text-sm transition ${
                active === doc.kind
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {doc.title}
              <span className="ml-2 text-xs opacity-75">
                {doc.isPublished ? `v${doc.version}` : "not published"}
              </span>
            </button>
          ))}
        </div>

        {loading || !current ? (
          <div className="h-64 animate-pulse rounded-2xl bg-muted/40" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
              <Input
                id="legal-title"
                label="Title"
                value={draft.title}
                disabled={!canEdit}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              />
              <div>
                <label htmlFor="legal-body" className="text-sm font-medium">
                  Text
                </label>
                <textarea
                  id="legal-body"
                  value={draft.body}
                  disabled={!canEdit}
                  onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                  rows={22}
                  placeholder={HINT}
                  className="mt-2 w-full rounded-xl border border-input bg-background p-3 font-mono text-sm leading-6"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Use <code># Heading</code>, <code>## Smaller heading</code>, <code>- bullet</code>{" "}
                  and <code>1. numbered</code>. Leave a blank line between paragraphs.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {canEdit && (
                  <Button
                    variant="accent"
                    loading={saving}
                    loadingText="Publishing…"
                    disabled={!dirty || !draft.body.trim()}
                    onClick={() => void publish()}
                  >
                    Publish {current.isPublished ? `as version ${current.version + 1}` : "version 1"}
                  </Button>
                )}
                <a href={`/legal/${active}`} target="_blank" rel="noreferrer">
                  <Button variant="outline">
                    <ExternalLink className="h-4 w-4" /> View the live page
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground">
                {current.isPublished
                  ? `Version ${current.version}, published ${new Date(current.publishedAt!).toLocaleString("en-NG")}${current.updatedByName ? ` by ${current.updatedByName}` : ""}.`
                  : "Not published yet — the public page says it is being finalised."}
                {!canEdit && " Only a Super Admin can publish changes."}
              </p>
            </section>

            <section className="rounded-2xl border border-border bg-background p-6">
              <div className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4" /> Preview
              </div>
              <h2 className="font-display text-2xl font-bold">{draft.title || current.title}</h2>
              <div className="mt-5">
                {draft.body.trim() ? (
                  <LegalText source={draft.body} />
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing written yet.</p>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </AppShell>
  );
}
