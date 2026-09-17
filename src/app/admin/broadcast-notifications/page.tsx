"use client";

import { useMemo, useState } from "react";
import { BellRing, Search, Sparkles, Trash2, Users } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui-kit/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform, type AdminBroadcast } from "@/lib/admin-platform";
import { useAuth } from "@/lib/auth";
import { hasUserPermission } from "@/lib/admin-rbac";

type BroadcastAudience = "students" | "teachers" | "admins" | "moderators" | "all";

const AUDIENCE_LABELS: Record<BroadcastAudience, string> = {
  students: "Students",
  teachers: "Teachers",
  admins: "Admins",
  moderators: "Moderators",
  all: "All users",
};

const AUDIENCE_OPTIONS: BroadcastAudience[] = ["students", "teachers", "admins", "moderators", "all"];

const TEMPLATES: { label: string; title: string; description: string }[] = [
  {
    label: "Welcome",
    title: "Welcome to MooreSkillUp 🎉",
    description:
      "We're glad to have you here. Explore your dashboard, start a course, and reach out to support anytime you need a hand.",
  },
  {
    label: "Seasonal",
    title: "Season's greetings from MooreSkillUp ✨",
    description:
      "Wishing you a wonderful season! Keep building your skills — new courses and updates are on the way.",
  },
  {
    label: "Maintenance",
    title: "Scheduled maintenance notice",
    description:
      "We'll be performing scheduled maintenance soon. The platform may be briefly unavailable. Thank you for your patience.",
  },
  {
    label: "New courses",
    title: "Fresh courses just landed 🚀",
    description:
      "New courses are now available in your track. Head to the catalog to see what's new and keep your momentum going.",
  },
];

const when = (value?: string | null) => (value ? new Date(value).toLocaleString("en-NG") : null);

/**
 * Announcements, and the record of what was already announced.
 *
 * There were two pages doing this, each showing only *your own* broadcasts, so
 * two admins could send the same notice twice and each see an empty history.
 * The history is everyone's now, and says who sent it and how many it reached.
 */
export default function BroadcastNotificationsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { broadcasts, createBroadcast, deleteBroadcast, isLoading, error } = useAdminPlatform();
  const { user } = useAuth();
  const [audience, setAudience] = useState<BroadcastAudience>("students");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [removing, setRemoving] = useState<AdminBroadcast | null>(null);
  const [busy, setBusy] = useState(false);

  const canSend = hasUserPermission(user?.permissions, "notifications:broadcast");
  const isScheduled = Boolean(scheduledAt) && new Date(scheduledAt).getTime() > Date.now();

  const history = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return broadcasts;
    return broadcasts.filter((item) =>
      [item.title, item.description, item.audience, item.sentByName ?? ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [broadcasts, search]);

  const sendBroadcast = async () => {
    if (!title.trim() || !description.trim()) return;
    setSending(true);
    try {
      const sent = await createBroadcast({
        title: title.trim(),
        description: description.trim(),
        audience,
        scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      notifySuccess(
        isScheduled ? "Scheduled" : "Sent",
        isScheduled
          ? `It goes out ${new Date(scheduledAt).toLocaleString("en-NG")}.`
          : `${sent.recipientCount ?? 0} ${sent.recipientCount === 1 ? "person" : "people"} were notified.`,
      );
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setExpiresAt("");
    } catch (actionError) {
      notifyError(
        "Unable to send broadcast",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setSending(false);
    }
  };

  const confirmDelete = async () => {
    if (!removing) return;
    setBusy(true);
    try {
      await deleteBroadcast(removing.id);
      notifySuccess("Removed from history");
      setRemoving(null);
    } catch (actionError) {
      notifyError("Unable to remove", actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  // Without this permission the data is never fetched, so the page used to
  // render its empty state and report zeros that were not true.
  if (!hasUserPermission(user?.permissions, "notifications:view")) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel title="You do not have access to broadcasts" detail="Announcements are sent by Admins and Super Admins." />
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Broadcasts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Announce something to a whole audience, and see what has already been announced.
          </p>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </header>

        {canSend && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <BellRing className="h-5 w-5 text-accent" />
              <h2 className="font-display text-lg font-semibold">New announcement</h2>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" /> Start from a template
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.label}
                      type="button"
                      onClick={() => {
                        setTitle(template.title);
                        setDescription(template.description);
                      }}
                      className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
                    >
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="broadcast-title" className="text-sm font-medium">
                  Title
                </label>
                <input
                  id="broadcast-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm shadow-sm outline-none"
                  placeholder="What's happening?"
                />
              </div>

              <div>
                <label htmlFor="broadcast-body" className="text-sm font-medium">
                  Message
                </label>
                <Textarea
                  id="broadcast-body"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="mt-2 min-h-28 bg-background"
                  placeholder="The details they need."
                />
              </div>

              <div>
                <div className="text-sm font-medium">Who gets it</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {AUDIENCE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAudience(option)}
                      aria-pressed={audience === option}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        audience === option
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {AUDIENCE_LABELS[option]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="broadcast-when" className="text-sm font-medium">
                    Send later (optional)
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">Leave empty to send now.</p>
                  <input
                    id="broadcast-when"
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm shadow-sm outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="broadcast-until" className="text-sm font-medium">
                    Stop showing it (optional)
                  </label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    After this, it leaves their notification bell. Empty means it stays.
                  </p>
                  <input
                    id="broadcast-until"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm shadow-sm outline-none"
                  />
                </div>
              </div>

              <Button
                variant="accent"
                onClick={() => void sendBroadcast()}
                loading={sending}
                loadingText={isScheduled ? "Scheduling…" : "Sending…"}
                disabled={!title.trim() || !description.trim()}
              >
                {isScheduled
                  ? `Schedule for ${AUDIENCE_LABELS[audience].toLowerCase()}`
                  : `Send to ${AUDIENCE_LABELS[audience].toLowerCase()}`}
              </Button>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold">Already announced</h2>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search announcements"
                aria-label="Search announcements"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
              />
            </div>
          </div>

          {isLoading && !broadcasts.length ? (
            <p className="p-6 text-sm text-muted-foreground">Loading announcements…</p>
          ) : !history.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {broadcasts.length ? "Nothing matches that search." : "Nothing has been announced yet."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {history.map((item) => {
                const sent = when(item.sentAt);
                const scheduled = when(item.scheduledAt);
                const expires = when(item.expiresAt);
                return (
                  <li key={item.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{item.title}</p>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold capitalize">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {AUDIENCE_LABELS[item.audience] ?? item.audience}
                        {item.sentByName ? ` · by ${item.sentByName}` : ""}
                        {item.status === "scheduled" && scheduled
                          ? ` · goes out ${scheduled}`
                          : sent
                            ? ` · sent ${sent}`
                            : ""}
                        {expires ? ` · leaves the bell ${expires}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {item.status === "sent" && (
                        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {item.recipientCount ?? 0}
                        </span>
                      )}
                      {canSend && (
                        <Button variant="outline" size="sm" onClick={() => setRemoving(item)}>
                          <Trash2 className="h-4 w-4" /> Remove
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={!!removing} onOpenChange={(open) => !open && !busy && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this from the history?</DialogTitle>
            <DialogDescription>
              “{removing?.title}” disappears from this list.{" "}
              {removing?.status === "sent"
                ? "The people who already received it keep it in their notifications."
                : "It hasn't gone out yet, so it never will."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setRemoving(null)}>
              Keep it
            </Button>
            <Button variant="accent" loading={busy} loadingText="Removing…" onClick={() => void confirmDelete()}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
