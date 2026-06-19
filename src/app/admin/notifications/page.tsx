"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Trash2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useFeedback } from "@/lib/feedback";
import { useAdminPlatform } from "@/lib/admin-platform";

export default function AdminNotificationsPage() {
  const { notifyError, notifySuccess } = useFeedback();
  const { broadcasts, clearBroadcastHistory, deleteBroadcast, isLoading, error } = useAdminPlatform();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return broadcasts;
    return broadcasts.filter((item) =>
      [item.title, item.description, item.audience].some((value) => value.toLowerCase().includes(query)),
    );
  }, [broadcasts, search]);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Notifications
            </div>
            <div className="mt-2 flex items-center gap-3">
              <h1 className="font-display text-4xl font-bold">Notification history</h1>
              {broadcasts.length > 0 && (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {broadcasts.length} active
                </span>
              )}
            </div>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Review sent and scheduled broadcasts, inspect full details, delete single items, or clear all history safely.
            </p>
            {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
          </div>
          <div className="flex w-full max-w-xl gap-3">
            <div className="flex-1">
              <Input
                label="Search notifications"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, message, or audience"
              />
            </div>
            <Button
              variant="outline"
              loading={actionKey === "clear-all"}
              loadingText="Clearing..."
              disabled={!broadcasts.length}
              onClick={async () => {
                setActionKey("clear-all");
                try {
                  await clearBroadcastHistory();
                  notifySuccess("Notification history cleared");
                } catch (actionError) {
                  notifyError(
                    "Unable to clear history",
                    actionError instanceof Error ? actionError.message : "Request failed.",
                  );
                } finally {
                  setActionKey(null);
                }
              }}
            >
              Clear history
            </Button>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-border bg-card p-4 shadow-sm">
            <div className="space-y-3">
              {filtered.length ? (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected?.id === item.id ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <div className="font-medium">{item.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description}</div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-primary">
                      {item.audience} | {item.sentAt ? new Date(item.sentAt).toLocaleString("en-NG") : "Pending"}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  {isLoading ? "Loading notifications..." : "No notifications matched your search."}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            {selected ? (
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-accent" />
                    <h2 className="font-display text-2xl font-bold">{selected.title}</h2>
                  </div>
                  <Button
                    variant="outline"
                    loading={actionKey === selected.id}
                    loadingText="Deleting..."
                    onClick={async () => {
                      setActionKey(selected.id);
                      try {
                        await deleteBroadcast(selected.id);
                        notifySuccess("Notification deleted");
                        setSelectedId(null);
                      } catch (actionError) {
                        notifyError(
                          "Unable to delete notification",
                          actionError instanceof Error ? actionError.message : "Request failed.",
                        );
                      } finally {
                        setActionKey(null);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete notification
                  </Button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <MetaCard label="Audience" value={selected.audience} />
                  <MetaCard label="Status" value={selected.status} />
                  <MetaCard
                    label="Sent at"
                    value={selected.sentAt ? new Date(selected.sentAt).toLocaleString("en-NG") : "Pending"}
                  />
                </div>

                <div className="mt-6 rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Message</div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{selected.description}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                Select a notification to view its full details.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium">{value}</div>
    </div>
  );
}
