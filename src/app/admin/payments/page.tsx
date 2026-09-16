"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FlaskConical, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { authenticatedRequest, buildApiUrl, getAccessToken } from "@/lib/authenticated-api";
import { formatNaira } from "@/lib/commerce";
import {
  useAdminPlatform,
  type AdminTransaction,
  type PaymentMode,
  type PaymentState,
} from "@/lib/admin-platform";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";

const PAGE_SIZE = 20;

const STATE_LABEL: Record<PaymentState, string> = {
  paid: "Paid",
  refunded: "Refunded",
  failed: "Failed",
  cancelled: "Cancelled",
  awaiting: "Awaiting payment",
  abandoned: "Checkout not finished",
};

const STATE_STYLE: Record<PaymentState, string> = {
  paid: "bg-success/10 text-success",
  refunded: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
  awaiting: "bg-warning/15 text-foreground",
  abandoned: "bg-muted text-muted-foreground",
};

const MODE_LABEL: Record<Exclude<PaymentMode, "live">, string> = {
  test: "Test payment",
  simulated: "Simulated",
};

const money = (row: Pick<AdminTransaction, "amount" | "currency">) =>
  row.currency === "NGN" ? formatNaira(Number(row.amount)) : `${row.currency} ${row.amount}`;

const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

/**
 * Every purchase, and what actually happened to it.
 *
 * This listed Paystack transactions, so one purchase opened twice showed as two.
 * It summed test-key checkouts into "Revenue tracked", called a checkout left
 * open for weeks "pending", and a refund's reason lived only in the audit log.
 */
export default function AdminPaymentsPage() {
  const { totals, transactions, systemAlerts, isLoading, error, reload } = useAdminPlatform();
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const [refundTarget, setRefundTarget] = useState<AdminTransaction | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<PaymentState | "all">("all");
  const [modeFilter, setModeFilter] = useState<"all" | "live" | "not-live">("all");
  const [page, setPage] = useState(1);
  const canRefund = user?.permissions?.includes("payments:refund") ?? false;
  const canExport = user?.permissions?.includes("analytics:export") ?? false;

  const testCount = transactions.filter((row) => row.mode !== "live").length;
  const refunded = transactions.filter((row) => row.state === "refunded" && row.mode === "live");
  const refundedTotal = refunded.reduce((sum, row) => sum + Number(row.amount), 0);
  const noRealMoney = testCount > 0 && !transactions.some((row) => row.mode === "live");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((row) => {
      if (stateFilter !== "all" && row.state !== stateFilter) return false;
      if (modeFilter === "live" && row.mode !== "live") return false;
      if (modeFilter === "not-live" && row.mode === "live") return false;
      if (!query) return true;
      return [row.reference ?? "", row.course.title, row.student.name, row.student.email].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [transactions, search, stateFilter, modeFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportCsv = async () => {
    const token = getAccessToken();
    const response = await fetch(buildApiUrl("/api/admin/transactions/export/"), {
      credentials: "include",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      notifyError("Export failed", "The payments export couldn't be created.");
      return;
    }
    const url = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "payments.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const confirmRefund = async () => {
    if (!refundTarget || !reason.trim()) return;
    try {
      setSubmitting(true);
      await authenticatedRequest(`/api/admin/payments/${refundTarget.paymentId}/refund/`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      notifySuccess("Refunded", `${refundTarget.student.name} no longer has ${refundTarget.course.title}.`);
      setRefundTarget(null);
      setReason("");
      await reload?.();
    } catch (refundError) {
      notifyError("Refund failed", refundError instanceof Error ? refundError.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Payments</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Every purchase, what happened to it, and refunds.
            </p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
          {canExport && (
            <Button variant="outline" onClick={() => void exportCsv()}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          )}
        </header>

        {(noRealMoney || systemAlerts.paymentsLive === false) && !isLoading && (
          <section className="flex gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm">
            <FlaskConical className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">No real money has been taken yet</p>
              <p className="mt-0.5 text-muted-foreground">
                {systemAlerts.paymentsLive === false
                  ? "This server has no Paystack key, so paid checkout is switched off."
                  : "Every payment so far went through a Paystack test key."}{" "}
                They&apos;re listed here and marked, but revenue counts live payments only.
              </p>
            </div>
          </section>
        )}

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Revenue" value={formatNaira(Number(totals?.revenue ?? 0))} hint="Live payments, less refunds" />
          <Stat label="Paid purchases" value={`${totals?.payments ?? 0}`} hint={`${totals?.payingStudents ?? 0} paying students`} />
          <Stat
            label="Refunded"
            value={formatNaira(refundedTotal)}
            hint={`${refunded.length} ${refunded.length === 1 ? "purchase" : "purchases"}`}
          />
          {testCount > 0 && (
            <Stat
              label="Test payments"
              value={`${totals?.testPayments ?? 0} paid`}
              hint={`${formatNaira(Number(totals?.testRevenue ?? 0))} — no money taken`}
            />
          )}
        </dl>

        <section className="rounded-2xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => resetPage(setSearch)(event.target.value)}
                placeholder="Search student, course or reference"
                aria-label="Search payments"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 lg:flex">
              <select
                value={stateFilter}
                onChange={(event) => resetPage(setStateFilter)(event.target.value as PaymentState | "all")}
                aria-label="Filter by what happened"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="all">Any outcome</option>
                {(Object.keys(STATE_LABEL) as PaymentState[]).map((state) => (
                  <option key={state} value={state}>
                    {STATE_LABEL[state]}
                  </option>
                ))}
              </select>
              <select
                value={modeFilter}
                onChange={(event) => resetPage(setModeFilter)(event.target.value as typeof modeFilter)}
                aria-label="Filter by real or test money"
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="all">Real and test</option>
                <option value="live">Real money only</option>
                <option value="not-live">Test only</option>
              </select>
            </div>
          </div>

          <p className="px-4 pt-3 text-xs text-muted-foreground">
            {isLoading ? "Loading payments…" : `${filtered.length} of ${transactions.length} purchases`}
          </p>

          {!isLoading && !visible.length ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              {transactions.length ? "No purchases match these filters." : "No one has bought a course yet."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {visible.map((row) => (
                <li key={row.paymentId} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{row.course.title}</p>
                      {row.mode !== "live" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                          <FlaskConical className="h-3 w-3" /> {MODE_LABEL[row.mode]}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {row.student.name} · {row.student.email}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.paidAt ? `Paid ${shortDate(row.paidAt)}` : `Started ${shortDate(row.createdAt)}`}
                      {row.reference && (
                        <>
                          {" · "}
                          <span className="font-mono">{row.reference}</span>
                        </>
                      )}
                    </p>
                    {row.state === "refunded" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Refunded{row.refundedAt ? ` ${shortDate(row.refundedAt)}` : ""}
                        {row.refundedByName ? ` by ${row.refundedByName}` : ""}
                        {row.refundReason ? ` — “${row.refundReason}”` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 md:justify-end">
                    <span className="font-semibold tabular-nums">{money(row)}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[row.state]}`}>
                      {STATE_LABEL[row.state]}
                    </span>
                    {canRefund && row.refund && (
                      row.refund.eligible ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setReason("");
                            setRefundTarget(row);
                          }}
                        >
                          Refund
                        </Button>
                      ) : (
                        <span className="max-w-56 text-xs text-muted-foreground">{row.refund.reason}</span>
                      )
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border p-4 text-sm">
              <span className="text-muted-foreground">
                Page {safePage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && !submitting && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Refund {refundTarget ? money(refundTarget) : ""}?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <p>
                  {refundTarget?.student.name} gets their money back for{" "}
                  <strong>{refundTarget?.course.title}</strong>. This can&apos;t be undone.
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>The course leaves their account straight away.</li>
                  <li>Any certificate for it stops verifying.</li>
                  <li>Their progress is kept, in case they buy it again.</li>
                </ul>
                {refundTarget && refundTarget.mode !== "live" && (
                  <p className="rounded-lg bg-muted p-2">
                    This was a test payment, so no real money moves.
                  </p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label htmlFor="refund-reason" className="text-sm font-medium">
              Why is this being refunded?
            </label>
            <Textarea
              id="refund-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Charged twice for the same course."
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">Shown on this payment and kept in the activity log.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" disabled={submitting} onClick={() => setRefundTarget(null)}>
              Keep payment
            </Button>
            <Button
              variant="accent"
              disabled={!reason.trim()}
              loading={submitting}
              loadingText="Refunding…"
              onClick={() => void confirmRefund()}
            >
              Refund {refundTarget ? money(refundTarget) : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-display text-2xl font-bold tabular-nums">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}
