"use client";

import { Award, BookOpen, CheckCircle2, Clock, Flame } from "lucide-react";

/** 95 -> "1h 35m", 40 -> "40m", 0 -> "0m". */
function formatMinutes(total: number) {
  if (total < 60) return `${total}m`;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * The top of the student's dashboard.
 *
 * A brand banner rather than another white card: it is the one place on the
 * page that should feel like MooreSkillUp rather than like a dashboard, and it
 * gives the eye somewhere to land before the working screen below.
 *
 * The stats sit inside it rather than in a separate grid — five objects at the
 * top of a page compete; one does not. Every figure is recorded, never derived
 * for effect.
 */
export function WelcomeBanner({
  name,
  streakDays = 0,
  enrolled = 0,
  completed = 0,
  totalMinutes = 0,
  certificates = 0,
  loading,
}: {
  name?: string;
  streakDays?: number;
  enrolled?: number;
  completed?: number;
  totalMinutes?: number;
  certificates?: number;
  loading?: boolean;
}) {
  const firstName = (name ?? "").trim().split(/\s+/)[0] || "there";

  const subtitle = loading
    ? ""
    : streakDays >= 2
      ? `You're on a ${streakDays}-day streak. Keep it running.`
      : enrolled === 0
        ? "Pick a course and let's get you started."
        : totalMinutes === 0
          ? "Open a lesson to start tracking your time."
          : "Pick up where you left off.";

  const stats = [
    { label: "Enrolled", value: String(enrolled), icon: BookOpen },
    { label: "Completed", value: String(completed), icon: CheckCircle2 },
    { label: "Time learning", value: formatMinutes(totalMinutes), icon: Clock },
    { label: "Certificates", value: String(certificates), icon: Award },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent via-accent to-[#e0560a] text-white">
      {/* Two soft highlights so the fill reads as depth rather than a flat
          block of orange. Purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_88%_-10%,rgba(255,255,255,0.28),transparent_45%),radial-gradient(circle_at_0%_110%,rgba(0,0,0,0.18),transparent_50%)]"
      />

      <div className="relative p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/75">{greeting()},</p>
            <h1 className="mt-0.5 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {firstName}
            </h1>
            {subtitle && <p className="mt-1.5 text-sm text-white/80">{subtitle}</p>}
          </div>

          {!loading && streakDays > 0 && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-bold backdrop-blur-sm">
              <Flame className="h-4 w-4" />
              {streakDays} {streakDays === 1 ? "day" : "days"}
            </span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="rounded-xl bg-white/12 px-3 py-2.5 backdrop-blur-sm ring-1 ring-inset ring-white/15"
            >
              <dt className="flex items-center gap-1.5 text-[11px] font-medium text-white/70">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </dt>
              <dd className="mt-0.5 font-display text-lg font-bold tabular-nums">
                {loading ? (
                  <span className="inline-block h-5 w-10 animate-pulse rounded bg-white/25" />
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
