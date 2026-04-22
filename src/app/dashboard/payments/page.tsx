"use client";

import { BadgeCheck, CreditCard, Receipt } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { formatNaira, getPaymentMethodLabel } from "@/lib/commerce";
import { useTeacherWorkspace } from "@/lib/teacher-workspace";

export default function DashboardPaymentsPage() {
  const { getStudentPayments } = useTeacherWorkspace();
  const payments = getStudentPayments();
  const totalSpent = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h1 className="font-display text-3xl font-bold">Payments</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review paid courses, payment dates, and the amount that unlocked each full course.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Total Transactions
            </div>
            <div className="mt-3 font-display text-3xl font-bold">{payments.length}</div>
          </div>
          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Total Spent
            </div>
            <div className="mt-3 font-display text-3xl font-bold">{formatNaira(totalSpent)}</div>
          </div>
          <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Payment Status
            </div>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
              <BadgeCheck className="h-4 w-4" /> Successful
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-bold">Transaction History</h2>
          </div>
          <div className="space-y-3">
            {payments.length ? (
              payments.map((payment) => (
                <div key={payment.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="font-medium">{payment.courseTitle}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{payment.description}</div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Payment Method: {getPaymentMethodLabel(payment.paymentMethod)}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground">Date: {payment.paidAt}</div>
                    </div>
                    <div className="text-left md:text-right">
                      <div className="font-display text-2xl font-bold">{formatNaira(payment.amount)}</div>
                      <div className="mt-1 text-sm text-emerald-600">Successful</div>
                      <div className="mt-1 text-xs text-muted-foreground">Ref: {payment.reference}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No payments yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
