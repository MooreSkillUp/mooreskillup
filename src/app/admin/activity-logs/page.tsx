"use client";

import { useEffect, useState } from "react";
import { Download, ScrollText, ShieldCheck, UserCog, Waves, X } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { downloadAuditLogCsv, useAuditLogs, type AuditLogEntry } from "@/lib/platform-admin";

const RESOURCE_FILTERS = [
  { value: "", label: "All actions" },
  { value: "course", label: "Courses" },
  { value: "review", label: "Reviews" },
  { value: "user", label: "Admin team" },
  { value: "teacher", label: "Teachers" },
  { value: "student", label: "Students" },
  { value: "payment", label: "Payments" },
  { value: "certificate", label: "Certificates" },
  { value: "notification", label: "Broadcasts" },
  { value: "support", label: "Support" },
  { value: "category", label: "Categories" },
  { value: "settings", label: "Settings" },
];

function describeChanges(log: AuditLogEntry) {
  const entries = Object.entries(log.changes ?? {});
  if (!entries.length) return null;
  return entries
    .map(([field, change]) => `${field}: ${String(change.before ?? "—")} → ${String(change.after ?? "—")}`)
    .join(" · ");
}

export default function AdminActivityLogsPage() {
  const { user } = useAuth();
  const { notifyError } = useFeedback();
  const [search, setSearch] = useState("");
  const [resourceType, setResourceType] = useState("");
  const [actor, setActor] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const param = new URLSearchParams(window.location.search).get("actor");
    if (param) setActor(param);
  }, []);

  const { logs, count, hasNext, isLoading, error } = useAuditLogs({ search, resourceType, actor, page });
  const canExport = user?.permissions?.includes("activity-logs:export") ?? false;

  const onExport = async () => {
    try {
      setExporting(true);
      await downloadAuditLogCsv({ search, resourceType });
    } catch (exportError) {
      notifyError(
        "Export failed",
        exportError instanceof Error ? exportError.message : "Unable to export logs.",
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Activity logs
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Who did what, and when</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Every admin action is recorded permanently: course approvals, account changes, broadcasts,
              settings edits, and more. Old entries are cleaned up automatically based on the retention
              period in Settings.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
          {canExport && (
            <Button variant="outline" onClick={() => void onExport()} loading={exporting} loadingText="Exporting...">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        {actor && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4">
            <div className="text-sm">
              Showing activity for <span className="font-semibold">{actor}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setActor("");
                setPage(1);
                if (typeof window !== "undefined") {
                  window.history.replaceState(null, "", "/admin/activity-logs");
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" /> Clear filter
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full max-w-sm">
            <Input
              label="Search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by action, name, or email"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {RESOURCE_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setResourceType(filter.value);
                  setPage(1);
                }}
                className={`rounded-full border px-4 py-2 text-sm transition ${
                  resourceType === filter.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <ScrollText className="h-5 w-5 text-primary" />
              Audit trail
            </h2>
            <span className="text-sm text-muted-foreground">{count} entries</span>
          </div>

          <div className="mt-5 space-y-3">
            {isLoading && (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                Loading audit trail...
              </div>
            )}
            {!isLoading && !logs.length && (
              <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                No audit entries match these filters yet. Admin actions will appear here as they happen.
              </div>
            )}
            {logs.map((log) => {
              const changes = describeChanges(log);
              return (
                <div key={log.id} className="rounded-3xl border border-border bg-background p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {log.resourceType === "user" ? (
                        <UserCog className="h-4 w-4 text-primary" />
                      ) : log.resourceType === "settings" ? (
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <Waves className="h-4 w-4 text-primary" />
                      )}
                      <span className="font-medium">{log.action}</span>
                      {log.resourceName && (
                        <span className="text-muted-foreground">· {log.resourceName}</span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString("en-NG")}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    By {log.actorName || log.actorEmail || "system"}
                    {log.actorRole ? ` (${log.actorRole.replace("_", " ")})` : ""}
                    {log.ipAddress ? ` · IP ${log.ipAddress}` : ""}
                  </div>
                  {changes && <div className="mt-2 text-sm text-foreground/80">{changes}</div>}
                </div>
              );
            })}
          </div>

          {(page > 1 || hasNext) && (
            <div className="mt-5 flex items-center justify-between">
              <Button variant="outline" size="sm" disabled={page <= 1 || isLoading} onClick={() => setPage(page - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page}</span>
              <Button variant="outline" size="sm" disabled={!hasNext || isLoading} onClick={() => setPage(page + 1)}>
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
