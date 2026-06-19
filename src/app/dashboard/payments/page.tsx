"use client";

import { CreditCard, Receipt } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { formatNaira } from "@/lib/commerce";
import { useAuth } from "@/lib/auth";
import { useMyPayments } from "@/lib/student";

const STATUS_STYLES: Record<string, string> = {
  successful: "bg-success/10 text-success",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground",
};

export default function DashboardPaymentsPage() {
  const { user } = useAuth();
  const { payments, isLoading } = useMyPayments(user?.role === "student");
  const totalSpent = payments
    .filter((p) => p.status === "successful")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h1 className="font-display text-3xl font-bold">Payments</h1>
          </div>
          <p className="mt-2 text-muted-foreground">Your course purchases and receipts.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Total spent</div>
            <div className="mt-2 font-display text-3xl font-bold">{formatNaira(totalSpent)}</div>
          </div>
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <div className="text-sm text-muted-foreground">Transactions</div>
            <div className="mt-2 font-display text-3xl font-bold">{payments.length}</div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <h2 className="font-display text-2xl font-bold">History</h2>
          {isLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-muted/40" />
              ))}
            </div>
          ) : !payments.length ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              <Receipt className="mx-auto h-8 w-8" />
              <p className="mt-2">No payments yet. Paid courses you buy will show up here.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4">
                  <div>
                    <div className="font-medium">{payment.courseTitle}</div>
                    <div className="text-xs text-muted-foreground">
                      {payment.reference ? `Ref ${payment.reference} · ` : ""}
                      {new Date(payment.paidAt ?? payment.createdAt).toLocaleString("en-NG")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{formatNaira(payment.amount)}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[payment.status] ?? "bg-muted text-muted-foreground"}`}>
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
