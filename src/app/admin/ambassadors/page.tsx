"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, Copy, Megaphone, Pencil, Plus } from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { hasUserPermission } from "@/lib/admin-rbac";
import { ambassadorLink, useAmbassadors, type Ambassador } from "@/lib/ambassadors";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";

/**
 * Ambassador links, and what each one has brought in.
 *
 * An ambassador never signs in: you make their link, they share it, and this
 * page is where you find out whether it worked. Ranked by people who paid, then
 * people who verified — clicks come last on purpose, because a link can be
 * clicked a thousand times and bring in nobody.
 */
const EMPTY = { name: "", code: "", phone: "", email: "", community: "", notes: "" };

export default function AmbassadorsPage() {
  const { user } = useAuth();
  const canView = hasUserPermission(user?.permissions, "ambassadors:view");
  const canManage = hasUserPermission(user?.permissions, "ambassadors:manage");
  const { ambassadors, isLoading, error, create, update } = useAmbassadors(canView);
  const { notifySuccess, notifyError } = useFeedback();

  const [draft, setDraft] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Ambassador | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const ranked = useMemo(
    () =>
      [...ambassadors].sort(
        (a, b) =>
          Number(b.isActive) - Number(a.isActive) ||
          b.paying - a.paying ||
          b.verified - a.verified ||
          b.clicks - a.clicks,
      ),
    [ambassadors],
  );

  const totals = useMemo(
    () =>
      ambassadors.reduce(
        (sum, a) => ({
          clicks: sum.clicks + a.clicks,
          verified: sum.verified + a.verified,
          paying: sum.paying + a.paying,
        }),
        { clicks: 0, verified: 0, paying: 0 },
      ),
    [ambassadors],
  );

  if (!canView) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel
          title="You do not have access to ambassadors"
          detail="Ambassador links are managed by Super Admins, and visible to Admins."
        />
      </AppShell>
    );
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const codeChanged = draft.code.trim().toUpperCase() !== editing.code;
        if (
          codeChanged &&
          !window.confirm(
            `Change ${editing.name}'s code to ${draft.code.toUpperCase()}? Every link already shared with ${editing.code} stops crediting them.`,
          )
        ) {
          setSaving(false);
          return;
        }
        await update(editing.id, draft);
        notifySuccess("Saved", `${draft.name} is up to date.`);
      } else {
        const created = await create(draft);
        notifySuccess("Ambassador added", `Their code is ${created.code}.`);
      }
      setDraft(EMPTY);
      setEditing(null);
      setShowForm(false);
    } catch (failure) {
      notifyError("Could not save", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: Ambassador) => {
    setEditing(item);
    setDraft({
      name: item.name,
      code: item.code,
      phone: item.phone,
      email: item.email,
      community: item.community,
      notes: item.notes,
    });
    setShowForm(true);
  };

  const toggleActive = async (item: Ambassador) => {
    try {
      await update(item.id, { isActive: !item.isActive });
      notifySuccess(
        item.isActive ? "Link retired" : "Link active again",
        item.isActive
          ? "New signups through it are no longer credited. Past ones stay."
          : "It credits new signups again.",
      );
    } catch (failure) {
      notifyError("Could not update", failure instanceof Error ? failure.message : "Request failed.");
    }
  };

  const copy = async (item: Ambassador) => {
    try {
      await navigator.clipboard.writeText(ambassadorLink(item.code));
      setCopied(item.id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      notifySuccess("Their link", ambassadorLink(item.code));
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Ambassadors</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Loading…"
                : `${ambassadors.length} ${ambassadors.length === 1 ? "link" : "links"} · ${totals.verified} verified signups · ${totals.paying} paying`}
            </p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
          {canManage && !showForm && (
            <Button
              variant="accent"
              className="shrink-0"
              onClick={() => {
                setEditing(null);
                setDraft(EMPTY);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add ambassador
            </Button>
          )}
        </header>

        {canManage && showForm && (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">
              {editing ? `Edit ${editing.name}` : "New ambassador"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="amb-name"
                label="Name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                required
              />
              <Input
                id="amb-code"
                label="Code"
                value={draft.code}
                onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
                placeholder="Leave empty to generate one"
                hint="Letters, numbers and dashes, e.g. UNIZIK-CHIDI."
              />
              <Input
                id="amb-community"
                label="Campus or community"
                value={draft.community}
                onChange={(e) => setDraft((d) => ({ ...d, community: e.target.value }))}
              />
              <Input
                id="amb-phone"
                label="Phone (WhatsApp)"
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              />
              <Input
                id="amb-email"
                label="Email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              />
              <Input
                id="amb-notes"
                label="Notes"
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="What you agreed with them"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="accent" loading={saving} loadingText="Saving…">
                {editing ? "Save changes" : "Create link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setDraft(EMPTY);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {!isLoading && ambassadors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <Megaphone className="mx-auto h-9 w-9 text-muted-foreground/40" />
            <p className="mt-3 font-medium">No ambassadors yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add one to give them a link you can measure.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4 font-medium">Ambassador</th>
                  <th className="p-4 font-medium">Code</th>
                  <th className="p-4 text-right font-medium">Visits</th>
                  <th className="p-4 text-right font-medium">Started</th>
                  <th className="p-4 text-right font-medium">Verified</th>
                  <th className="p-4 text-right font-medium">Paying</th>
                  <th className="p-4" />
                </tr>
              </thead>
              <tbody>
                {ranked.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border last:border-0 ${item.isActive ? "" : "opacity-55"}`}
                  >
                    <td className="p-4">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[item.community, item.phone].filter(Boolean).join(" · ") || "—"}
                        {!item.isActive && " · retired"}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs">{item.code}</td>
                    <td className="p-4 text-right tabular-nums">{item.clicks}</td>
                    <td className="p-4 text-right tabular-nums text-muted-foreground">{item.started}</td>
                    <td className="p-4 text-right font-medium tabular-nums">{item.verified}</td>
                    <td className="p-4 text-right font-semibold tabular-nums text-accent">{item.paying}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => void copy(item)}>
                          {copied === item.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          {copied === item.id ? "Copied" : "Copy link"}
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>
                              <Pencil className="h-4 w-4" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => void toggleActive(item)}>
                              {item.isActive ? "Retire" : "Reactivate"}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Visits count once per browser session. Verified means they entered the emailed code.
          Paying counts live payments only — test-key checkouts are excluded.
        </p>
      </div>
    </AppShell>
  );
}
