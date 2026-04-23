"use client";

import { CreditCard, Wallet } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { formatNaira } from "@/lib/commerce";
import { useAdminPlatform } from "@/lib/admin-platform";

export default function AdminPaymentsPage() {
  const { totals, transactions, isLoading, error } = useAdminPlatform();

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
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
            <div className="font-display text-2xl font-bold">Transactions</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Verified At</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length ? (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{transaction.reference}</td>
                      <td className="px-4 py-3 capitalize">{transaction.provider}</td>
                      <td className="px-4 py-3">
                        {transaction.currency === "NGN"
                          ? formatNaira(Number(transaction.amount))
                          : `${transaction.currency} ${transaction.amount}`}
                      </td>
                      <td className="px-4 py-3 capitalize">{transaction.provider_status}</td>
                      <td className="px-4 py-3">
                        {transaction.verified_at ? new Date(transaction.verified_at).toLocaleString("en-NG") : "Pending"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-muted-foreground">
                      {isLoading ? "Loading transactions..." : "No transactions yet."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
