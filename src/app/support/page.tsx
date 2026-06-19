"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, LifeBuoy, Plus } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { createSupportTicket, SUPPORT_CATEGORIES, useStudentTickets } from "@/lib/student";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-success/10 text-success",
  closed: "bg-muted text-muted-foreground",
};

export default function StudentSupportPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const { tickets, isLoading, refresh } = useStudentTickets(user?.role === "student");

  const [category, setCategory] = useState("technical");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) return;
    try {
      setSubmitting(true);
      await createSupportTicket({ category, title: title.trim(), description: description.trim() });
      notifySuccess("Ticket submitted", "Our team will get back to you.");
      setTitle("");
      setDescription("");
      await refresh();
    } catch (e) {
      notifyError("Couldn't submit", e instanceof Error ? e.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Support</div>
          <h1 className="mt-2 font-display text-4xl font-bold">Need a hand?</h1>
          <p className="mt-2 text-muted-foreground">Raise a ticket and our team will help you out.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <form onSubmit={onSubmit} className="space-y-4 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-bold">New ticket</h2>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {SUPPORT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Subject" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <div className="space-y-2">
              <label className="text-sm font-medium">Describe the issue</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-32 bg-background"
                placeholder="Tell us what's happening..."
              />
            </div>
            <Button type="submit" variant="accent" disabled={!title.trim() || !description.trim()} loading={submitting} loadingText="Submitting...">
              <LifeBuoy className="h-4 w-4" /> Submit ticket
            </Button>
          </form>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-2xl font-bold">Your tickets</h2>
            <div className="mt-4 space-y-3">
              {isLoading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted/40" />
                ))
              ) : !tickets.length ? (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                  <LifeBuoy className="mx-auto h-8 w-8" />
                  <p className="mt-2">No tickets yet. Raise one and we&apos;ll help.</p>
                </div>
              ) : (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{ticket.title}</div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[ticket.status] ?? "bg-muted text-muted-foreground"}`}>
                        {ticket.status.replace("_", " ")}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                    {ticket.adminNotes && (
                      <div className="mt-3 rounded-xl bg-primary/5 p-3 text-sm">
                        <div className="flex items-center gap-1 font-medium text-primary">
                          {ticket.status === "resolved" ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
                          Support reply
                        </div>
                        <p className="mt-1 text-muted-foreground">{ticket.adminNotes}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
