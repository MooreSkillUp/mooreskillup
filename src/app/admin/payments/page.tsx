"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CreditCard, Download, Search, Wallet } from "lucide-react";
import { buildApiUrl } from "@/lib/authenticated-api";
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
import { formatNaira } from "@/lib/commerce";
import { useAdminPlatform, type AdminTransaction } from "@/lib/admin-platform";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";

export default function AdminPaymentsPage() {
  const { totals, transactions, isLoading, error, reload } = useAdminPlatform();
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const [refundTarget, setRefundTarget] = useState<AdminTransaction | null>(null);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const canRefund = user?.permissions?.includes("payments:refund") ?? false;
  const canExport = user?.permissions?.includes("analytics:export") ?? false;

  const PAGE_SIZE = 15;

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    const fromTime = fromDate ? new Date(fromDate).getTime() : null;
    const toTime = toDate ? new Date(toDate).getTime() + 24 * 60 * 60 * 1000 : null;
    return transactions.filter((transaction) => {
      const status = transaction.payment__status ?? transaction.provider_status ?? "";
      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (fromTime || toTime) {
        const when = transaction.created_at ? new Date(transaction.created_at).getTime() : null;
        if (when === null) return false;
        if (fromTime && when < fromTime) return false;
        if (toTime && when > toTime) return false;
      }
      if (!query) return true;
      return [
        transaction.reference,
        transaction.payment__course__title,
        transaction.payment__student__user__display_name,
        transaction.payment__student__user__email,
      ]
        .filter(Boolean)
        .some((value) => (value as string).toLowerCase().includes(query));
    });
  }, [transactions, search, statusFilter, fromDate, toDate]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedTransactions = filteredTransactions.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportCsv = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("mooreskillup.access-token") : null;
    const response = await fetch(buildApiUrl("/api/admin/transactions/export/"), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      notifyError("Export failed", "Unable to export revenue.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "revenue.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const confirmRefund = async () => {
    if (!refundTarget?.payment_id || !reason.trim()) return;
    try {
      setSubmitting(true);
      await authenticatedRequest(`/api/admin/payments/${refundTarget.payment_id}/refund/`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      notifySuccess("Refund processed", "The student has been refunded and lost course access.");
      setRefundTarget(null);
      setReason("");
      await reload?.();
    } catch (e) {
      notifyError("Refund failed", e instanceof Error ? e.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Payments oversight
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Admin payments</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Review platform payment activity, successful transactions, and total revenue from one backend-powered admin surface.
            </p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
          {canExport && (
            <Button variant="outline" onClick={() => void exportCsv()}>
              <Download className="h-4 w-4" /> Export revenue CSV
            </Button>
          )}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <CreditCard className="h-6 w-6" />
            </div>
            <div className="mt-5 font-display text-3xl font-bold">{totals?.payments ?? 0}</div>
            <div className="mt-1 text-sm text-muted-foreground">Successful payments</div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet className="h-6 w-6" />
            </div>
            <div className="mt-5 font-display text-3xl font-bold">{formatNaira(Number(totals?.revenue ?? 0))}</div>
            <div className="mt-1 text-sm text-muted-foreground">Revenue tracked</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
          <div className="border-b border-border px-6 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="font-display text-2xl font-bold">Transactions</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {filteredTransactions.length} of {transactions.length} transactions
                </div>
              </div>
              <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-auto lg:grid-cols-4">
                <div className="relative sm:col-span-2 lg:col-span-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => {
                      setSearch(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search reference, course, student"
                    className="h-10 w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                >
                  <option value="all">All statuses</option>
                  <option value="successful">Successful</option>
                  <option value="pending">Pending</option>
                  <option value="refunded">Refunded</option>
                  <option value="failed">Failed</option>
                </select>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  aria-label="From date"
                />
                <input
                  type="date"
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value);
                    setPage(1);
                  }}
                  className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                  aria-label="To date"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  {canRefund && <th className="px-4 py-3">Action</th>}
                </tr>
              </thead>
              <tbody>
                {pagedTransactions.length ? (
                  pagedTransactions.map((transaction) => {
                    const paymentStatus = transaction.payment__status ?? transaction.provider_status;
                    return (
                      <tr key={transaction.id} className="border-t border-border">
                        <td className="px-4 py-3 font-mono text-xs">{transaction.reference}</td>
                        <td className="px-4 py-3">{transaction.payment__course__title ?? "—"}</td>
                        <td className="px-4 py-3">{transaction.payment__student__user__display_name ?? "—"}</td>
                        <td className="px-4 py-3">
                          {transaction.currency === "NGN"
                            ? formatNaira(Number(transaction.amount))
                            : `${transaction.currency} ${transaction.amount}`}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                              paymentStatus === "successful"
                                ? "bg-success/10 text-success"
                                : paymentStatus === "refunded"
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"
                            }`}
                          >
                            {paymentStatus}
                          </span>
                        </td>
                        {canRefund && (
                          <td className="px-4 py-3">
                            {paymentStatus === "successful" ? (
                              transaction.refundEligible ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReason("");
                                    setRefundTarget(transaction);
                                  }}
                                >
                                  Refund
                                </Button>
                              ) : (
                                <span className="text-xs text-muted-foreground" title={transaction.refundReason}>
                                  Not refundable
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={canRefund ? 6 : 5} className="px-4 py-6 text-muted-foreground">
                      {isLoading
                        ? "Loading transactions..."
                        : transactions.length
                          ? "No transactions match your filters."
                          : "No transactions yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTransactions.length > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-6 py-4 text-sm">
              <div className="text-muted-foreground">
                Page {safePage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={safePage === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={safePage === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!refundTarget} onOpenChange={(open) => !open && setRefundTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Refund this payment?
            </DialogTitle>
            <DialogDescription>
              {refundTarget?.payment__student__user__display_name} will be refunded{" "}
              {formatNaira(Number(refundTarget?.amount ?? 0))} for{" "}
              <strong>{refundTarget?.payment__course__title}</strong> and will lose access to the course.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for refund (required)</label>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="e.g. Student requested a refund within the policy window."
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">This reason is saved to the activity log.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="accent"
              disabled={!reason.trim()}
              loading={submitting}
              loadingText="Refunding..."
              onClick={() => void confirmRefund()}
            >
              Confirm refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
