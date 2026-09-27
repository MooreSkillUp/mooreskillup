"use client";

import { AlertTriangle, Lock, Unlock } from "lucide-react";

import { naira, type RevenueSplit } from "./types";

/**
 * The month in one screen: what came in, what the processor took, and where
 * the rest went.
 *
 * The reserve is shown as a remainder rather than a percentage, because that
 * is what it is — the pool takes a fixed share, teachers take whatever their
 * own courses agreed, and whatever is left is the company's.
 */
export function SplitSummary({ split }: { split: RevenueSplit }) {
  const reserve = Number(split.reserveAmount);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            split.status === "closed"
              ? "bg-muted text-muted-foreground"
              : "bg-success/15 text-success"
          }`}
        >
          {split.status === "closed" ? (
            <>
              <Lock className="h-3.5 w-3.5" /> Closed — these figures are final
            </>
          ) : (
            <>
              <Unlock className="h-3.5 w-3.5" /> Open — recalculated every time you look
            </>
          )}
        </span>
        <span className="text-sm text-muted-foreground">
          {split.saleCount} {split.saleCount === 1 ? "sale" : "sales"}
        </span>
      </div>

      {split.salesMissingFee > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            <strong>{split.salesMissingFee}</strong>{" "}
            {split.salesMissingFee === 1 ? "sale has" : "sales have"} no processor fee recorded, so
            the net revenue here is higher than what actually landed. Those fees cannot be recovered
            — Paystack reports them once.
          </p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Figure label="Gross" value={naira(split.gross)} muted />
        <Figure label="Payment processor" value={`− ${naira(split.processorFees)}`} muted />
        <Figure label="Net revenue" value={naira(split.netRevenue)} strong />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Figure
          label="Teachers"
          value={naira(split.teacherTotal)}
          hint="each course at its own agreed rate"
        />
        <Figure
          label="Operations pool"
          value={naira(split.operationsPool)}
          hint={`${split.operationsPercentUsed}% of net`}
        />
        <Figure
          label="Company reserve"
          value={naira(split.reserveAmount)}
          hint="everything left over"
          negative={reserve < 0}
        />
      </div>

      {reserve < 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <p>
            The reserve is negative. The month&apos;s costs came to more than the revenue could
            cover, so the shortfall is being carried by the business. Expected in the first months
            — worth watching once sales are steady.
          </p>
        </div>
      )}
    </section>
  );
}

function Figure({
  label,
  value,
  hint,
  strong,
  muted,
  negative,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
  muted?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p
        className={`mt-1 tabular-nums ${strong ? "text-2xl font-semibold" : "text-xl font-medium"} ${
          negative ? "text-destructive" : muted ? "text-muted-foreground" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
