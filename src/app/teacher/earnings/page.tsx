"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Clock, Wallet } from "lucide-react";

import {
  LINE_LABEL,
  naira,
  periodLabel,
  shortDate,
  type EarningLine,
} from "@/components/admin/payouts/types";
import { AppShell } from "@/components/dashboard/AppShell";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

interface CourseTerm {
  course: string;
  sharePercent: string;
  startsAt: string;
  endsAt: string;
  isRunning: boolean;
}

interface PastPayout {
  period: string;
  amount: string;
  status: string;
  paidAt: string | null;
  reference: string;
}

interface Earnings {
  summary: { pending: string; payable: string; paid: string };
  courses: CourseTerm[];
  lines: EarningLine[];
  payouts: PastPayout[];
}

/**
 * What a teacher has earned, in their own words.
 *
 * The two things they most want to know are how much is coming and when their
 * course stops earning, so both are near the top. Everything else is the
 * workings, for the month they want to check a figure.
 */
export default function TeacherEarningsPage() {
  const { notifyError } = useFeedback();
  const [data, setData] = useState<Earnings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData(await authenticatedRequest<Earnings>("/api/teacher/earnings/"));
    } catch (failure) {
      notifyError("Could not load your earnings", failure instanceof Error ? failure.message : "");
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AppShell allowedRoles={["teacher"]}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Your earnings</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            You earn a share of what each of your courses makes, for twelve months from the day it
            was published. A sale counts once its 14-day refund window has closed, and payments go
            out monthly.
          </p>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && data && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Figure
                icon={<Wallet className="h-4 w-4" />}
                label="Ready to be paid"
                value={naira(data.summary.payable)}
                hint="past the refund window"
              />
              <Figure
                icon={<Clock className="h-4 w-4" />}
                label="Still settling"
                value={naira(data.summary.pending)}
                hint="inside the 14-day refund window"
                muted
              />
              <Figure
                icon={<CalendarClock className="h-4 w-4" />}
                label="Paid so far"
                value={naira(data.summary.paid)}
              />
            </div>

            {data.courses.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Your courses
                </h2>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Course</th>
                        <th className="px-4 py-3 text-right">Your share</th>
                        <th className="px-4 py-3">Earning until</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.courses.map((course) => (
                        <tr key={course.course} className="border-t">
                          <td className="px-4 py-3 font-medium">{course.course}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {course.sharePercent}%
                          </td>
                          <td className="px-4 py-3">
                            {shortDate(course.endsAt)}
                            {!course.isRunning && (
                              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                                ended
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {data.payouts.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Payments to you
                </h2>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Month</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3">Sent</th>
                        <th className="px-4 py-3">Reference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payouts.map((payout) => (
                        <tr key={payout.period} className="border-t">
                          <td className="px-4 py-3">{periodLabel(payout.period)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {naira(payout.amount)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {payout.paidAt ? shortDate(payout.paidAt) : payout.status}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {payout.reference || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Every sale
              </h2>
              {data.lines.length === 0 ? (
                <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
                  No sales yet. They appear here as soon as somebody buys your course.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Course</th>
                        <th className="px-4 py-3">Sold</th>
                        <th className="px-4 py-3 text-right">Student paid</th>
                        <th className="px-4 py-3 text-right">Fee</th>
                        <th className="px-4 py-3 text-right">Your share</th>
                        <th className="px-4 py-3">State</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.lines.map((line) => (
                        <tr key={line.id} className="border-t">
                          <td className="px-4 py-3">{line.course}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {shortDate(line.paidAt)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{naira(line.gross)}</td>
                          <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                            − {naira(line.processorFee)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums">
                            {naira(line.amount)}
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {LINE_LABEL[line.status]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

function Figure({
  icon,
  label,
  value,
  hint,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${muted ? "text-muted-foreground" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
