"use client";

import { useMemo, useState } from "react";
import { BellRing, Trash2 } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { usePlatformNotifications } from "@/lib/platform-notifications";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearAll,
    deleteNotification,
  } = usePlatformNotifications(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(notifications[0]?.id ?? null);
  const [actionKey, setActionKey] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notifications;
    return notifications.filter((item) =>
      [item.title, item.body, item.sender].some((value) => value.toLowerCase().includes(query)),
    );
  }, [notifications, search]);

  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0] ?? null;

  return (
    <AppShell allowedRoles={["student", "teacher"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Notifications
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Your notification center</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Review platform updates, admin broadcasts, and recent learning messages from one organized place.
            </p>
          </div>
          <div className="flex w-full max-w-xl gap-3">
            <div className="flex-1">
              <Input
                label="Search notifications"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search title, message, or sender"
              />
            </div>
            <Button variant="outline" onClick={() => void markAllAsRead()} disabled={!unreadCount}>
              Mark all read
            </Button>
            <Button variant="outline" onClick={() => void clearAll()} disabled={!notifications.length}>
              Clear all
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <MetricCard label="Total" value={`${notifications.length}`} />
          <MetricCard label="Unread" value={`${unreadCount}`} />
          <MetricCard
            label="Read"
            value={`${notifications.filter((item) => item.isRead).length}`}
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[2rem] border border-border bg-card p-4 shadow-sm">
            <div className="space-y-3">
              {filtered.length ? (
                filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id);
                      if (!item.isRead) {
                        void markAsRead(item.id);
                      }
                    }}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selected?.id === item.id ? "border-primary bg-primary/5" : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium">{item.title}</div>
                        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.body}</div>
                      </div>
                      {!item.isRead ? (
                        <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                      ) : null}
                    </div>
                    <div className="mt-2 text-xs uppercase tracking-[0.2em] text-primary">
                      {item.sender} | {new Date(item.createdAt).toLocaleString("en-NG")}
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                  No notifications matched your search.
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
                        await deleteNotification(selected.id);
                        setSelectedId(null);
                      } finally {
                        setActionKey(null);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  <MetaCard label="Sender" value={selected.sender} />
                  <MetaCard label="State" value={selected.isRead ? "Read" : "Unread"} />
                  <MetaCard label="Received" value={new Date(selected.createdAt).toLocaleString("en-NG")} />
                </div>

                <div className="mt-6 rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Message</div>
                  <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{selected.body}</div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                Select a notification to view its details.
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="font-display text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{label}</div>
    </div>
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
