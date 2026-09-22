"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Pencil, Plus, Tag } from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useAuth } from "@/lib/auth";
import { authenticatedRequest, buildApiUrl, parseJsonSafely } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

/**
 * Discount campaigns: the founding price, and every promotion after it.
 *
 * One mechanism rather than special code per promotion. A campaign takes a
 * percentage off the list price, between two dates, for everyone or for
 * founding members, optionally for one programme. Where two overlap the bigger
 * discount wins; they never stack, because stacking is how a 50% and a 60%
 * campaign end up giving courses away.
 */
interface Campaign {
  id: number;
  name: string;
  percentOff: number;
  startsAt: string;
  endsAt: string;
  audience: "everyone" | "founding";
  categoryId: string | null;
  categoryName: string;
  showCountdown: boolean;
  isActive: boolean;
  state: "scheduled" | "running" | "finished" | "ended";
  purchases: number;
}

interface Category {
  id: string;
  name: string;
}

const STATE_LABEL: Record<Campaign["state"], string> = {
  scheduled: "Scheduled",
  running: "Running",
  finished: "Finished",
  ended: "Ended early",
};

const STATE_STYLE: Record<Campaign["state"], string> = {
  scheduled: "bg-muted text-muted-foreground",
  running: "bg-success/15 text-success",
  finished: "bg-muted text-muted-foreground",
  ended: "bg-destructive/10 text-destructive",
};

/** <input type="datetime-local"> wants local wall-clock with no zone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const EMPTY = {
  name: "",
  percentOff: "30",
  startsAt: "",
  endsAt: "",
  audience: "everyone" as Campaign["audience"],
  categoryId: "",
  showCountdown: true,
};

export default function CampaignsPage() {
  const { user } = useAuth();
  const canView = hasUserPermission(user?.permissions, "campaigns:view");
  const canManage = hasUserPermission(user?.permissions, "campaigns:manage");
  const { notifySuccess, notifyError } = useFeedback();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setCampaigns(await authenticatedRequest<Campaign[]>("/api/admin/campaigns/"));
      const cats = await fetch(buildApiUrl("/api/categories/")).then(parseJsonSafely);
      const list = Array.isArray(cats) ? cats : (cats?.results ?? []);
      setCategories(list.map((c: Category) => ({ id: String(c.id), name: c.name })));
    } catch (failure) {
      notifyError("Could not load campaigns", failure instanceof Error ? failure.message : "");
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  const running = useMemo(() => campaigns.filter((c) => c.state === "running"), [campaigns]);

  if (!canView) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel title="You do not have access to campaigns" />
      </AppShell>
    );
  }

  const startEdit = (c: Campaign) => {
    setEditing(c);
    setDraft({
      name: c.name,
      percentOff: String(c.percentOff),
      startsAt: toLocalInput(c.startsAt),
      endsAt: toLocalInput(c.endsAt),
      audience: c.audience,
      categoryId: c.categoryId ?? "",
      showCountdown: c.showCountdown,
    });
    setShowForm(true);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const body = {
      name: draft.name,
      percentOff: Number(draft.percentOff),
      startsAt: draft.startsAt ? new Date(draft.startsAt).toISOString() : "",
      endsAt: draft.endsAt ? new Date(draft.endsAt).toISOString() : "",
      audience: draft.audience,
      categoryId: draft.categoryId || null,
      showCountdown: draft.showCountdown,
    };
    try {
      if (editing) {
        const saved = await authenticatedRequest<Campaign>(`/api/admin/campaigns/${editing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setCampaigns((all) => all.map((c) => (c.id === saved.id ? saved : c)));
        notifySuccess("Saved", `${saved.name} is up to date.`);
      } else {
        const created = await authenticatedRequest<Campaign>("/api/admin/campaigns/", {
          method: "POST",
          body: JSON.stringify(body),
        });
        setCampaigns((all) => [created, ...all]);
        notifySuccess(
          "Campaign created",
          `${created.name} — ${created.percentOff}% off, ${STATE_LABEL[created.state].toLowerCase()}.`,
        );
      }
      setShowForm(false);
      setEditing(null);
      setDraft(EMPTY);
    } catch (failure) {
      notifyError("Could not save", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const endNow = async (c: Campaign) => {
    if (!window.confirm(`End ${c.name} now? Prices go back to normal immediately.`)) return;
    try {
      const saved = await authenticatedRequest<Campaign>(`/api/admin/campaigns/${c.id}/`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      setCampaigns((all) => all.map((x) => (x.id === saved.id ? saved : x)));
      notifySuccess("Ended", `${c.name} no longer applies.`);
    } catch (failure) {
      notifyError("Could not end it", failure instanceof Error ? failure.message : "Request failed.");
    }
  };

  const pct = Number(draft.percentOff);

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Campaigns</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              A named discount between two dates. Where campaigns overlap, the bigger discount
              wins — they never add together.
              {running.length > 0 &&
                ` Running now: ${running.map((c) => `${c.name} (${c.percentOff}%)`).join(", ")}.`}
            </p>
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
              <Plus className="h-4 w-4" /> New campaign
            </Button>
          )}
        </header>

        {canManage && showForm && (
          <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg font-semibold">
              {editing ? `Edit ${editing.name}` : "New campaign"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="camp-name"
                label="Name"
                placeholder="Founding price"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                required
              />
              <Input
                id="camp-percent"
                label="Discount (%)"
                type="number"
                min={1}
                max={100}
                value={draft.percentOff}
                onChange={(e) => setDraft((d) => ({ ...d, percentOff: e.target.value }))}
                hint={pct === 100 ? "100% makes courses free — students enrol without paying." : undefined}
                required
              />
              <Input
                id="camp-start"
                label="Starts"
                type="datetime-local"
                value={draft.startsAt}
                onChange={(e) => setDraft((d) => ({ ...d, startsAt: e.target.value }))}
                required
              />
              <Input
                id="camp-end"
                label="Ends"
                type="datetime-local"
                value={draft.endsAt}
                onChange={(e) => setDraft((d) => ({ ...d, endsAt: e.target.value }))}
                required
              />
              <div>
                <label htmlFor="camp-audience" className="text-sm font-medium">
                  Who gets it
                </label>
                <select
                  id="camp-audience"
                  value={draft.audience}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, audience: e.target.value as Campaign["audience"] }))
                  }
                  className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="everyone">Everyone</option>
                  <option value="founding">Founding members only</option>
                </select>
              </div>
              <div>
                <label htmlFor="camp-category" className="text-sm font-medium">
                  Which courses
                </label>
                <select
                  id="camp-category"
                  value={draft.categoryId}
                  onChange={(e) => setDraft((d) => ({ ...d, categoryId: e.target.value }))}
                  className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="">Every course</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      Only {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                id="camp-countdown"
                type="checkbox"
                checked={draft.showCountdown}
                onChange={(e) => setDraft((d) => ({ ...d, showCountdown: e.target.checked }))}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              Show a countdown to the end on course pages
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="accent" loading={saving} loadingText="Saving…">
                {editing ? "Save changes" : "Create campaign"}
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

        {loading ? (
          <div className="h-40 animate-pulse rounded-2xl bg-muted/40" />
        ) : campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
            <Tag className="mx-auto h-9 w-9 text-muted-foreground/40" />
            <p className="mt-3 font-medium">No campaigns yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The founding price is the first one: founding members, from D-10 to D+7.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {campaigns.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                      {c.percentOff}% off
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATE_STYLE[c.state]}`}>
                      {STATE_LABEL[c.state]}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {when(c.startsAt)} → {when(c.endsAt)} ·{" "}
                    {c.audience === "founding" ? "Founding members" : "Everyone"} ·{" "}
                    {c.categoryName ? `Only ${c.categoryName}` : "Every course"} · {c.purchases}{" "}
                    {c.purchases === 1 ? "purchase" : "purchases"}
                  </div>
                </div>
                {canManage && (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => startEdit(c)}>
                      <Pencil className="h-4 w-4" /> Edit
                    </Button>
                    {c.isActive && c.state !== "finished" && (
                      <Button variant="ghost" size="sm" onClick={() => void endNow(c)}>
                        End now
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}
