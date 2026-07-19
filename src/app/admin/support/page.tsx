"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LifeBuoy,
  MessageSquare,
  Send,
  Trash2,
  UserCheck,
  Zap,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { Textarea } from "@/components/ui/textarea";
import { useAdminPlatform } from "@/lib/admin-platform";
import { useAuth } from "@/lib/auth";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useFeedback } from "@/lib/feedback";

// ─── Priority badge ────────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  urgent: "bg-destructive/10 text-destructive",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  resolved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  closed: "bg-muted text-muted-foreground",
};

function Badge({ label, style }: { label: string; style: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${style}`}>
      {label.replace("_", " ")}
    </span>
  );
}

export default function AdminSupportPage() {
  const { supportTickets, updateSupportTicket, deleteSupportTicket, isLoading, error } =
    useAdminPlatform();
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const canCloseTickets = hasUserPermission(user?.permissions, "support:close");
  const canAssignTickets = hasUserPermission(user?.permissions, "support:assign") || hasUserPermission(user?.permissions, "support:add-notes");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);

  // ── Derived counts ────────────────────────────────────────────────────────
  const openCount = supportTickets.filter((t) => t.status === "open").length;
  const inProgressCount = supportTickets.filter((t) => t.status === "in_progress").length;
  const resolvedCount = supportTickets.filter(
    (t) => t.status === "resolved" || t.status === "closed",
  ).length;
  const urgentCount = supportTickets.filter(
    (t) => t.priority === "urgent" || t.priority === "high",
  ).length;

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return supportTickets.filter((ticket) => {
      const matchesSearch =
        !query ||
        [ticket.title, ticket.description, ticket.category, ticket.createdBy].some((v) =>
          v.toLowerCase().includes(query),
        );
      const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
      const matchesRole =
        roleFilter === "all" || ticket.createdByRole === roleFilter;
      const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
      return matchesSearch && matchesStatus && matchesRole && matchesPriority;
    });
  }, [search, statusFilter, roleFilter, priorityFilter, supportTickets]);

  const selected = filtered.find((t) => t.id === selectedId) ?? filtered[0] ?? null;

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      setAdminNotes("");
      return;
    }
    if (!selectedId || !filtered.some((t) => t.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    setAdminNotes(selected?.admin_notes ?? "");
    setReplyText("");
  }, [selected?.id, selected?.admin_notes]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  async function handleUpdate(field: Record<string, unknown>) {
    if (!selected) return;
    const key = Object.keys(field)[0];
    setActionKey(`${selected.id}:${key}`);
    try {
      await updateSupportTicket(selected.id, field);
      notifySuccess("Ticket updated");
    } catch (err) {
      notifyError("Unable to update ticket", err instanceof Error ? err.message : "Request failed.");
    } finally {
      setActionKey(null);
    }
  }

  async function handleAssignToMe() {
    if (!selected || !user) return;
    setActionKey(`${selected.id}:assign`);
    try {
      await updateSupportTicket(selected.id, {
        assigned_to: user.displayName,
        assigned_to_email: user.email,
        status: "in_progress",
      });
      notifySuccess("Ticket assigned to you");
    } catch (err) {
      notifyError("Unable to assign ticket", err instanceof Error ? err.message : "Request failed.");
    } finally {
      setActionKey(null);
    }
  }

  async function handleReply() {
    if (!selected || !replyText.trim()) return;
    setActionKey(`${selected.id}:reply`);
    try {
      await updateSupportTicket(selected.id, {
        comment: replyText.trim(),
        is_internal: isInternal,
      });
      notifySuccess(isInternal ? "Internal note added" : "Reply sent");
      setReplyText("");
    } catch (err) {
      notifyError("Unable to send reply", err instanceof Error ? err.message : "Request failed.");
    } finally {
      setActionKey(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Support tickets
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">
              Student and teacher support queue
            </h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Review issues raised by students and teachers, assign tickets, reply or leave
              internal notes, update priority and status, and close resolved issues.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="w-full max-w-sm">
            <Input
              label="Search tickets"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Title, user, or category…"
            />
          </div>
        </div>

        {/* Metric cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={AlertCircle} label="Open" value={`${openCount}`} />
          <MetricCard icon={Clock3} label="In progress" value={`${inProgressCount}`} />
          <MetricCard icon={CheckCircle2} label="Resolved / closed" value={`${resolvedCount}`} />
          <MetricCard icon={Zap} label="High / urgent" value={`${urgentCount}`} />
        </div>

        {/* Main layout */}
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          {/* ── Ticket list ── */}
          <div className="rounded-[2rem] border border-border bg-card p-4 shadow-sm">
            {/* Filters */}
            <div className="mb-4 flex flex-wrap gap-2">
              {/* Status */}
              {[
                { label: "All", value: "all" },
                { label: "Open", value: "open" },
                { label: "In progress", value: "in_progress" },
                { label: "Resolved", value: "resolved" },
                { label: "Closed", value: "closed" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatusFilter(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    statusFilter === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Role + priority row */}
            <div className="mb-4 flex flex-wrap gap-2">
              {[
                { label: "All roles", value: "all" },
                { label: "Students", value: "student" },
                { label: "Teachers", value: "teacher" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRoleFilter(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    roleFilter === opt.value
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <span className="mx-1 self-center text-border">|</span>
              {[
                { label: "All priority", value: "all" },
                { label: "Urgent", value: "urgent" },
                { label: "High", value: "high" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPriorityFilter(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                    priorityFilter === opt.value
                      ? "border-destructive/60 bg-destructive/10 text-destructive"
                      : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Ticket rows */}
            <div className="space-y-3">
              {filtered.length ? (
                filtered.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelectedId(ticket.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected?.id === ticket.id
                        ? "border-primary bg-primary/5"
                        : "border-border bg-background hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium leading-snug">{ticket.title}</div>
                      <Badge
                        label={ticket.priority}
                        style={PRIORITY_STYLES[ticket.priority] ?? "bg-muted text-muted-foreground"}
                      />
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {ticket.createdBy}
                      {ticket.createdByRole
                        ? ` · ${ticket.createdByRole}`
                        : ""}{" "}
                      · {ticket.category}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge
                        label={ticket.status}
                        style={STATUS_STYLES[ticket.status] ?? "bg-muted text-muted-foreground"}
                      />
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString("en-NG")}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  {isLoading ? "Loading tickets…" : "No support tickets matched your filters."}
                </div>
              )}
            </div>
          </div>

          {/* ── Ticket detail ── */}
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            {selected ? (
              <div className="space-y-5">
                {/* Title row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <LifeBuoy className="h-5 w-5 shrink-0 text-accent" />
                    <h2 className="font-display text-2xl font-bold leading-tight">
                      {selected.title}
                    </h2>
                  </div>
                  <Button
                    variant="outline"
                    loading={actionKey === `${selected.id}:delete`}
                    loadingText="Deleting…"
                    disabled={!canCloseTickets}
                    onClick={async () => {
                      setActionKey(`${selected.id}:delete`);
                      try {
                        await deleteSupportTicket(selected.id);
                        notifySuccess("Ticket deleted");
                        setSelectedId(null);
                      } catch (err) {
                        notifyError(
                          "Unable to delete",
                          err instanceof Error ? err.message : "Request failed.",
                        );
                      } finally {
                        setActionKey(null);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>

                {/* Meta grid */}
                <div className="grid gap-3 md:grid-cols-3">
                  <MetaCard label="Raised by" value={selected.createdBy} />
                  <MetaCard
                    label="Role"
                    value={selected.createdByRole ?? "—"}
                  />
                  <MetaCard label="Category" value={selected.category} />
                  <MetaCard
                    label="Assigned to"
                    value={selected.assigned_to ?? "Unassigned"}
                  />
                  <MetaCard
                    label="Created"
                    value={new Date(selected.created_at).toLocaleString("en-NG")}
                  />
                  <MetaCard
                    label="Updated"
                    value={new Date(selected.updated_at).toLocaleString("en-NG")}
                  />
                </div>

                {/* Description */}
                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    Issue description
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                    {selected.description}
                  </div>
                </div>

                {/* Status / Priority / Assign row */}
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <select
                      value={selected.status}
                      disabled={!canCloseTickets}
                      onChange={(e) => void handleUpdate({ status: e.target.value })}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Priority</label>
                    <select
                      value={selected.priority}
                      onChange={(e) => void handleUpdate({ priority: e.target.value })}
                      className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      className="w-full"
                      disabled={!canAssignTickets}
                      loading={actionKey === `${selected.id}:assign`}
                      loadingText="Assigning…"
                      onClick={() => void handleAssignToMe()}
                    >
                      <UserCheck className="h-4 w-4" /> Assign to me
                    </Button>
                  </div>
                </div>

                {/* Admin notes */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin notes (internal)</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="min-h-24 bg-background"
                    placeholder="Internal notes visible only to admins…"
                  />
                  <Button
                    variant="outline"
                    loading={actionKey === `${selected.id}:admin_notes`}
                    loadingText="Saving…"
                    onClick={() => void handleUpdate({ admin_notes: adminNotes })}
                  >
                    Save notes
                  </Button>
                </div>

                {/* Reply box */}
                <div className="rounded-3xl border border-border bg-background p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                      Reply to ticket
                    </span>
                  </div>
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="min-h-24 bg-card"
                    placeholder="Write a reply visible to the user, or toggle internal note…"
                  />
                  <div className="flex items-center justify-between gap-3">
                    {/* Internal toggle */}
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isInternal}
                        onClick={() => setIsInternal((v) => !v)}
                        className={`relative h-6 w-10 rounded-full transition-colors ${
                          isInternal ? "bg-amber-500" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                            isInternal ? "left-4" : "left-0.5"
                          }`}
                        />
                      </button>
                      {isInternal ? "Internal note (admins only)" : "Visible to user"}
                    </label>
                    <Button
                      variant="accent"
                      disabled={!replyText.trim()}
                      loading={actionKey === `${selected.id}:reply`}
                      loadingText="Sending…"
                      onClick={() => void handleReply()}
                    >
                      <Send className="h-4 w-4" /> Send reply
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                Select a support ticket to review and respond.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AlertCircle;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <div className="mt-5 font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium capitalize">{value}</div>
    </div>
  );
}
