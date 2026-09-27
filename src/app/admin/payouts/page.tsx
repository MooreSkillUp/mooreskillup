"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";

import { PayoutCard } from "@/components/admin/payouts/PayoutCard";
import {
  naira,
  periodLabel,
  thisPeriod,
  type Payout,
  type PayoutRun,
} from "@/components/admin/payouts/types";
import { AppShell } from "@/components/dashboard/AppShell";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Button } from "@/components/ui-kit/Button";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useAuth } from "@/lib/auth";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

/**
 * Paying teachers.
 *
 * The platform works out what is owed and records that it was sent. It does
 * not move money: you approve a figure here, transfer it at your bank, and put
 * the reference back in. Marking something paid that has not been paid is the
 * one mistake this screen is shaped to avoid.
 */
export default function PayoutsPage() {
  const { user } = useAuth();
  const canView = hasUserPermission(user?.permissions, "payments:view");
  const canAct = hasUserPermission(user?.permissions, "payments:refund");
  const { notifySuccess, notifyError } = useFeedback();

  const [period, setPeriod] = useState(thisPeriod());
  const [run, setRun] = useState<PayoutRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRun(await authenticatedRequest<PayoutRun>(`/api/admin/payouts/?period=${period}`));
    } catch (failure) {
      notifyError("Could not load payouts", failure instanceof Error ? failure.message : "");
    } finally {
      setLoading(false);
    }
  }, [period, notifyError]);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  const periods = useMemo(() => {
    const known = new Set(run?.periods ?? []);
    known.add(period);
    known.add(thisPeriod());
    return [...known].sort().reverse();
  }, [run?.periods, period]);

  if (!canView) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel title="You do not have access to payouts" />
      </AppShell>
    );
  }

  const generate = async () => {
    setBusy(true);
    try {
      const result = await authenticatedRequest<{
        newLines: number;
        nowPayable: number;
        reversed: number;
        payouts: number;
      }>("/api/admin/payouts/", { method: "POST", body: JSON.stringify({ period }) });
      notifySuccess(
        "Run finished",
        `${result.newLines} new ${result.newLines === 1 ? "sale" : "sales"} recorded, ` +
          `${result.nowPayable} now past the refund window, ${result.payouts} ` +
          `${result.payouts === 1 ? "payout" : "payouts"} ready.`,
      );
      await load();
    } catch (failure) {
      notifyError("Could not run", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const act = async (payout: Payout, body: Record<string, unknown>, done: string) => {
    setBusy(true);
    try {
      await authenticatedRequest(`/api/admin/payouts/${payout.id}/action/`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      notifySuccess(done, payout.teacherName);
      await load();
    } catch (failure) {
      notifyError("Could not do that", failure instanceof Error ? failure.message : "");
    } finally {
      setBusy(false);
    }
  };

  const approve = (payout: Payout) =>
    act(payout, { action: "approve" }, "Approved — now make the transfer");

  const pay = (payout: Payout, reference: string) =>
    act(payout, { action: "pay", reference }, "Recorded as paid");

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Payouts</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              What each teacher is owed once their sales have passed the 14-day refund window.
              Approve the figure here, transfer it at your bank, then record the reference.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              {periods.map((value) => (
                <option key={value} value={value}>
                  {periodLabel(value)}
                </option>
              ))}
            </select>
            {canAct && (
              <Button type="button" onClick={generate} disabled={busy}>
                <Play className="mr-2 h-4 w-4" />
                {busy ? "Working…" : "Run this month"}
              </Button>
            )}
          </div>
        </header>

        {run && (
          <div className="grid gap-3 sm:grid-cols-4">
            <Total label="Waiting for approval" value={run.totals.owed} />
            <Total label="Approved, not yet sent" value={run.totals.approved} />
            <Total label="Paid" value={run.totals.paid} />
            <Total label="Carried to next month" value={run.totals.carried} muted />
          </div>
        )}

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && run && run.payouts.length === 0 && (
          <div className="rounded-lg border px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing for {periodLabel(period)} yet.
            </p>
            {canAct && (
              <p className="mt-1 text-xs text-muted-foreground">
                Press <strong>Run this month</strong> to record new sales and build the payouts.
                Sales only become payable once their 14-day refund window has closed.
              </p>
            )}
          </div>
        )}

        {!loading && run && run.payouts.length > 0 && (
          <div className="space-y-3">
            {run.payouts.map((payout) => (
              <PayoutCard
                key={payout.id}
                payout={payout}
                canAct={canAct}
                onApprove={approve}
                onPay={pay}
                busy={busy}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Total({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-xl font-medium tabular-nums ${muted ? "text-muted-foreground" : ""}`}
      >
        {naira(value)}
      </p>
    </div>
  );
}
