"use client";

import { useCallback, useEffect, useState } from "react";
import { LifeBuoy } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { Textarea } from "@/components/ui/textarea";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

type SupportTicket = {
  id: string;
  category: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  admin_notes: string;
  created_at: string;
};

export default function TeacherSupportPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("technical");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const nextTickets = await authenticatedRequest<SupportTicket[]>("/api/teacher/support-tickets/");
      setTickets(nextTickets);
    } catch (error) {
      notifyError(
        "Unable to load support tickets",
        error instanceof Error ? error.message : "Request failed.",
      );
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  return (
    <AppShell allowedRoles={["teacher", "admin"]}>
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Support
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">Teacher support tickets</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Report platform issues, technical bugs, payment concerns, or student problems directly to the admin workspace.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-accent" />
              <h2 className="font-display text-2xl font-bold">Create ticket</h2>
            </div>
            <div className="mt-5 space-y-4">
              <Input
                label="Issue title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Brief summary of the issue"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                >
                  <option value="technical">Technical Problem</option>
                  <option value="payment">Payment Issue</option>
                  <option value="course">Course Access Problem</option>
                  <option value="student">Student Report</option>
                  <option value="account">Account Recovery</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-36 bg-background"
                  placeholder="Describe the issue clearly, including what happened and what you expected."
                />
              </div>
              <Button
                variant="accent"
                loading={submitting}
                loadingText="Submitting ticket..."
                onClick={async () => {
                  if (!title.trim() || !description.trim()) return;
                  setSubmitting(true);
                  try {
                    await authenticatedRequest("/api/teacher/support-tickets/", {
                      method: "POST",
                      body: JSON.stringify({ title: title.trim(), category, description: description.trim() }),
                    });
                    setTitle("");
                    setDescription("");
                    notifySuccess("Support ticket submitted");
                    await loadTickets();
                  } catch (error) {
                    notifyError(
                      "Unable to submit support ticket",
                      error instanceof Error ? error.message : "Request failed.",
                    );
                  } finally {
                    setSubmitting(false);
                  }
                }}
              >
                Submit support ticket
              </Button>
            </div>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display text-2xl font-bold">Recent tickets</h2>
            <div className="mt-5 space-y-3">
              {tickets.length ? (
                tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="font-medium">{ticket.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{ticket.category} | {ticket.status}</div>
                    <div className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{ticket.description}</div>
                    {ticket.admin_notes ? (
                      <div className="mt-3 rounded-2xl bg-card p-3 text-sm text-muted-foreground">
                        Admin notes: {ticket.admin_notes}
                      </div>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  {loading ? "Loading tickets..." : "No support tickets submitted yet."}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
