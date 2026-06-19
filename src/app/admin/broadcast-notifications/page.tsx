"use client";

import { useState } from "react";
import { BellRing, Sparkles } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui-kit/Button";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform } from "@/lib/admin-platform";

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

export default function BroadcastNotificationsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { broadcasts, createBroadcast, clearBroadcastHistory, isLoading } = useAdminPlatform();
  const [audience, setAudience] = useState<BroadcastAudience>("students");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [success, setSuccess] = useState("");
  const [broadcastLoading, setBroadcastLoading] = useState(false);

  const applyTemplate = (template: (typeof TEMPLATES)[number]) => {
    setTitle(template.title);
    setDescription(template.description);
  };

  const sendBroadcast = async () => {
    if (!title.trim() || !description.trim()) return;
    setBroadcastLoading(true);
    try {
      const isScheduled = Boolean(scheduledAt) && new Date(scheduledAt).getTime() > Date.now();
      await createBroadcast({
        title: title.trim(),
        description: description.trim(),
        audience,
        scheduledAt: isScheduled ? new Date(scheduledAt).toISOString() : undefined,
      });
      setSuccess(
        isScheduled
          ? `Broadcast scheduled for ${new Date(scheduledAt).toLocaleString("en-NG")} (${AUDIENCE_LABELS[audience]})`
          : `Notification sent to ${AUDIENCE_LABELS[audience].toLowerCase()}`,
      );
      setTitle("");
      setDescription("");
      setScheduledAt("");
      notifySuccess(isScheduled ? "Broadcast scheduled" : "Broadcast sent");
    } catch (actionError) {
      notifyError("Unable to send broadcast", actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setBroadcastLoading(false);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <section className="rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <BellRing className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl font-bold">Broadcast notifications</h2>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Send an announcement to a whole audience. Broadcasts appear in the recipient&apos;s notification bell
          and history auto-expires after 24 hours.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Quick templates
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground">Title / header</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-sm outline-none"
              placeholder="Notification title"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">Message</label>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-28 bg-background"
              placeholder="Notification description"
            />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Target audience</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {AUDIENCE_OPTIONS.map((option) => {
                const active = audience === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAudience(option)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground"
                    }`}
                  >
                    {AUDIENCE_LABELS[option]}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">Schedule (optional)</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Leave empty to send immediately, or pick a future date and time.
            </p>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="mt-2 h-11 rounded-lg border border-input bg-background px-3.5 text-sm text-foreground shadow-sm outline-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="accent" onClick={() => void sendBroadcast()} loading={broadcastLoading} loadingText="Sending...">
              {scheduledAt ? "Schedule notification" : "Send notification"}
            </Button>
            {success && <div className="text-sm font-medium text-success">{success}</div>}
          </div>
        </div>

        <div className="mt-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Notification history
            </div>
            <Button
              variant="outline"
              onClick={() => void clearBroadcastHistory()}
              disabled={!broadcasts.length}
            >
              Clear Notification History
            </Button>
          </div>
          <div className="mt-4 space-y-3">
            {broadcasts.length ? (
              broadcasts.map((item) => (
                <div key={item.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium">{item.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{item.description}</div>
                    </div>
                    <div className="text-sm text-muted-foreground md:text-right">
                      <div>Audience: {AUDIENCE_LABELS[item.audience] ?? item.audience}</div>
                      {item.status === "scheduled" && item.scheduledAt ? (
                        <div>Scheduled for: {new Date(item.scheduledAt).toLocaleString("en-NG")}</div>
                      ) : (
                        <div>Date sent: {item.sentAt ? new Date(item.sentAt).toLocaleString("en-NG") : "Pending"}</div>
                      )}
                      <div className="font-medium text-foreground">Status: {item.status}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                {isLoading ? "Loading broadcasts..." : "No broadcasts in the active 24-hour window."}
              </div>
            )}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
