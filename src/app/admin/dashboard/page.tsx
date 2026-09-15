"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FolderCheck,
  LifeBuoy,
  Mail,
  Trash2,
  UserPlus,
} from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { hasUserPermission, type AdminResourceAction } from "@/lib/admin-rbac";
import { useAdminPlatform } from "@/lib/admin-platform";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/commerce";

type RangeKey = "7" | "30" | "90" | "all";

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

type AttentionItem = {
  key: string;
  icon: typeof FolderCheck;
  title: string;
  detail: string | null;
  href: string;
  cta: string;
  count: number;
  permission: string;
};

/**
 * The admin's home screen. Its one job is answering "what needs me?".
 *
 * It used to open with six stat tiles and show the review queue three times —
 * a tile, a "needs attention" row and a shortcut, all the same number — while
 * never saying how long a teacher had been left waiting. The heading now states
 * the answer outright, the work comes first with its age, and numbers follow.
 */
export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { teachers, courses, supportTickets, totals, activityFeed, systemAlerts, isLoading, error } =
    useAdminPlatform();
  const [range, setRange] = useState<RangeKey>("30");

  const can = (permission: string) =>
    hasUserPermission(user?.permissions, permission as AdminResourceAction);

  const firstName = (user?.fullName || user?.displayName || "").trim().split(/\s+/)[0] || "there";

  const queue = courses.filter((course) => course.status === "review");
  const readyToPublish = courses.filter((course) => course.status === "approved");
  const deletionRequests = courses.filter((course) => course.pendingDeletion);
  const openTickets = supportTickets.filter((ticket) => ticket.status === "open");
  const failedPayments = systemAlerts.failedPayments ?? 0;
  const activeTeachers = teachers.filter((teacher) => teacher.status === "active").length;

  // How long a teacher has been left without an answer. Courses submitted before
  // submission time was recorded carry no timestamp, and are older than any that do.
  let oldestWait: string | null = null;
  if (queue.length) {
    if (queue.some((course) => !course.submittedAt)) {
      oldestWait = "Oldest was submitted before timing was recorded";
    } else {
      const days = Math.max(
        ...queue.map((course) =>
          Math.floor((Date.now() - new Date(course.submittedAt as string).getTime()) / 86_400_000),
        ),
      );
      oldestWait = days === 0 ? "All submitted today" : `Oldest waiting ${plural(days, "day")}`;
    }
  }

  const attention = (
    [
      {
        key: "reviews",
        icon: FolderCheck,
        title: `${plural(queue.length, "course")} waiting for review`,
        detail: oldestWait,
        href: "/admin/reviews",
        cta: "Review",
        count: queue.length,
        permission: "courses:approve",
      },
      {
        key: "publish",
        icon: CheckCircle2,
        title: `${plural(readyToPublish.length, "approved course")} ready to publish`,
        detail: "Approved by a moderator, not yet visible to students",
        href: "/admin/reviews",
        cta: "Publish",
        count: readyToPublish.length,
        permission: "courses:publish",
      },
      {
        key: "deletions",
        icon: Trash2,
        title: plural(deletionRequests.length, "course deletion request"),
        detail: "A teacher asked to remove a course — it stays live until you decide",
        href: "/admin/courses",
        cta: "Decide",
        count: deletionRequests.length,
        permission: "courses:delete",
      },
      {
        key: "tickets",
        icon: LifeBuoy,
        title: plural(openTickets.length, "open support ticket"),
        detail: null,
        href: "/admin/support",
        cta: "Open",
        count: openTickets.length,
        permission: "support:view",
      },
      {
        key: "payments",
        icon: AlertTriangle,
        title: plural(failedPayments, "failed payment"),
        detail: null,
        href: "/admin/payments",
        cta: "View",
        count: failedPayments,
        permission: "payments:view",
      },
    ] satisfies AttentionItem[]
  ).filter((item) => item.count > 0 && can(item.permission));

  // Integrations that fail silently. Shown only to those who can act on settings,
  // and only when the server has actually reported them off.
  const setupIssues = [
    systemAlerts.emailDelivers === false
      ? {
          key: "email",
          icon: Mail,
          title: "Email isn't being delivered",
          detail:
            "Teacher invites, password resets and completion emails are written to a server log instead of sent. Set BREVO_API_KEY and redeploy.",
        }
      : null,
    systemAlerts.paymentsLive === false
      ? {
          key: "payments",
          icon: CreditCard,
          title: "Payments aren't configured",
          detail:
            "Paid checkout is refusing rather than enrolling anyone for free. Set PAYSTACK_SECRET_KEY and redeploy.",
        }
      : null,
  ].filter((issue): issue is NonNullable<typeof issue> => issue !== null);
  const showSetup = can("admin-settings:view") && setupIssues.length > 0;

  const revenue = Number(totals?.revenue ?? 0);
  const tiles = [
    { label: "Students", value: `${totals?.students ?? 0}`, href: "/admin/students", permission: "students:view" },
    { label: "Active teachers", value: `${activeTeachers}`, href: "/admin/teachers", permission: "teachers:view" },
    { label: "Live courses", value: `${totals?.publishedCourses ?? 0}`, href: "/admin/courses", permission: "courses:view" },
    {
      label: "Active enrollments",
      value: `${totals?.activeEnrollments ?? 0}`,
      href: "/admin/analytics",
      permission: "analytics:view",
    },
    {
      label: "Revenue",
      value: formatNaira(Number.isFinite(revenue) ? revenue : 0),
      href: "/admin/payments",
      permission: "payments:view",
      // With no key on the server, every "successful" payment was simulated.
      hint: systemAlerts.paymentsLive === false ? "Not real charges — payments aren't live" : undefined,
    },
  ].filter((tile) => can(tile.permission));

  const rangedActivity = useMemo(() => {
    if (range === "all") return activityFeed;
    const cutoff = Date.now() - Number(range) * 86_400_000;
    return activityFeed.filter((event) => new Date(event.timestamp).getTime() >= cutoff);
  }, [activityFeed, range]);

  const headline = isLoading
    ? "Checking the platform…"
    : attention.length
      ? `${plural(attention.length, "thing")} need${attention.length === 1 ? "s" : ""} you`
      : "Nothing needs you right now";

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {greeting()}, {firstName}
            </p>
            <h1 className="mt-0.5 font-display text-2xl font-bold sm:text-3xl">{headline}</h1>
            {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {can("teachers:create") && (
              <Link href="/admin/teachers?new=1">
                <Button variant="accent">
                  <UserPlus className="h-4 w-4" /> Create teacher
                </Button>
              </Link>
            )}
            {can("notifications:broadcast") && (
              <Link href="/admin/broadcast-notifications">
                <Button variant="outline">Send a broadcast</Button>
              </Link>
            )}
          </div>
        </header>

        {showSetup && (
          <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
            <h2 className="text-sm font-semibold text-destructive">Setup that is silently failing</h2>
            <ul className="mt-3 space-y-3">
              {setupIssues.map(({ key, icon: Icon, title, detail }) => (
                <li key={key} className="flex gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {attention.length > 0 ? (
          <section>
            <h2 className="sr-only">Needs your attention</h2>
            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {attention.map(({ key, icon: Icon, title, detail, href, cta }) => (
                <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{title}</p>
                    {detail && <p className="text-sm text-muted-foreground">{detail}</p>}
                  </div>
                  <Link href={href}>
                    <Button variant="outline" size="sm">
                      {cta}
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          !isLoading && (
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border px-5 py-4 text-sm text-muted-foreground">
              <CheckCircle2 className="h-5 w-5 text-success" />
              No courses waiting, no open tickets, no failed payments.
            </div>
          )
        )}

        <section>
          <h2 className="sr-only">Platform at a glance</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {tiles.map((tile) => (
              <Link
                key={tile.label}
                href={tile.href}
                className="group rounded-2xl border border-border bg-card px-5 py-4 transition-colors hover:border-accent/50"
              >
                <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
                <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                  {isLoading ? (
                    <span className="inline-block h-7 w-12 animate-pulse rounded bg-muted" />
                  ) : (
                    tile.value
                  )}
                </p>
                {"hint" in tile && tile.hint && (
                  <p className="mt-0.5 text-xs text-destructive">{tile.hint}</p>
                )}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Recent activity</h2>
            <div className="flex items-center gap-3">
              <select
                id="activity-range"
                aria-label="Activity date range"
                value={range}
                onChange={(event) => setRange(event.target.value as RangeKey)}
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Link href="/admin/activity-logs" className="text-sm font-medium text-accent hover:underline">
                View all
              </Link>
            </div>
          </div>
          <ul className="mt-4 divide-y divide-border">
            {rangedActivity.length ? (
              rangedActivity.slice(0, 6).map((event) => (
                <li key={event.id} className="py-3">
                  <p className="text-sm font-medium">{event.title}</p>
                  <p className="text-sm text-muted-foreground">{event.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(event.timestamp).toLocaleString("en-NG", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </li>
              ))
            ) : (
              <li className="py-3 text-sm text-muted-foreground">
                {isLoading ? "Loading activity…" : "No activity in this range."}
              </li>
            )}
          </ul>
        </section>
      </div>
    </AppShell>
  );
}
