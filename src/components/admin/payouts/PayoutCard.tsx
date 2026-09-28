"use client";

import { useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Landmark,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";

import {
  LINE_LABEL,
  naira,
  shortDate,
  STATUS_LABEL,
  STATUS_STYLE,
  type Payout,
} from "./types";

interface Props {
  payout: Payout;
  canAct: boolean;
  onApprove: (payout: Payout) => Promise<void>;
  onPay: (payout: Payout, reference: string) => Promise<void>;
  busy: boolean;
}

/**
 * One teacher's month: what they are owed, what it is made of, and the two
 * steps to getting it to them.
 *
 * Approve and pay are deliberately separate. Approving says the figure is
 * right; paying records a transfer that actually happened at the bank. Putting
 * them on one button would mean marking money as sent before sending it.
 */
export function PayoutCard({ payout, canAct, onApprove, onPay, busy }: Props) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");

  const blocked = !payout.bank.onFile
    ? "No bank details on file — add them before this can be approved."
    : !payout.bank.verified
      ? "The bank details have not been verified since they last changed. Check them, then verify."
      : null;

  const submitPayment = async (event: FormEvent) => {
    event.preventDefault();
    await onPay(payout, reference);
    setReference("");
  };

  return (
    <article className="rounded-lg border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-medium">{payout.teacherName}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[payout.status]}`}>
              {STATUS_LABEL[payout.status]}
            </span>
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Landmark className="h-3.5 w-3.5" />
            {payout.bank.onFile
              ? `${payout.bank.bankName} ${payout.bank.masked}`
              : "No bank details on file"}
            {payout.bank.onFile &&
              (payout.bank.verified ? (
                <span className="flex items-center gap-1 text-success">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  not verified
                </span>
              ))}
          </p>
          {payout.status === "paid" && (
            <p className="mt-1 text-xs text-muted-foreground">
              Paid {shortDate(payout.paidAt)}
              {payout.reference && ` · ${payout.reference}`}
              {payout.paidBy && ` · by ${payout.paidBy}`}
            </p>
          )}
          {payout.note && <p className="mt-1 text-xs text-muted-foreground">{payout.note}</p>}
        </div>

        <div className="text-right">
          <p className="text-xl font-semibold tabular-nums">{naira(payout.amount)}</p>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="mt-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {payout.lines.length} {payout.lines.length === 1 ? "sale" : "sales"}
            {payout.adjustments.length > 0 && `, ${payout.adjustments.length} adjusted`}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Course</th>
                  <th className="px-4 py-2">Sold</th>
                  <th className="px-4 py-2 text-right">Paid</th>
                  <th className="px-4 py-2 text-right">Fee</th>
                  <th className="px-4 py-2 text-right">Rate</th>
                  <th className="px-4 py-2 text-right">Earns</th>
                  <th className="px-4 py-2">State</th>
                </tr>
              </thead>
              <tbody>
                {payout.lines.map((line) => (
                  <tr key={line.id} className="border-t">
                    <td className="px-4 py-2">{line.course}</td>
                    <td className="px-4 py-2 text-muted-foreground">{shortDate(line.paidAt)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{naira(line.gross)}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                      − {naira(line.processorFee)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{line.sharePercent}%</td>
                    <td className="px-4 py-2 text-right tabular-nums font-medium">
                      {naira(line.amount)}
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {LINE_LABEL[line.status]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {payout.adjustments.length > 0 && (
            <div className="border-t bg-muted/30 px-4 py-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">Adjustments</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {payout.adjustments.map((adjustment) => (
                  <li key={adjustment.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {adjustment.kindLabel}
                      {adjustment.reason && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {adjustment.reason}
                        </span>
                      )}
                    </span>
                    <span
                      className={`tabular-nums ${
                        Number(adjustment.amount) < 0 ? "text-destructive" : ""
                      }`}
                    >
                      {naira(adjustment.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {canAct && payout.status === "draft" && (
        <div className="border-t p-4">
          {blocked ? (
            <p className="flex items-start gap-2 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {blocked}
            </p>
          ) : (
            <Button type="button" onClick={() => onApprove(payout)} disabled={busy}>
              <Check className="mr-2 h-4 w-4" />
              Approve {naira(payout.amount)}
            </Button>
          )}
        </div>
      )}

      {canAct && payout.status === "approved" && (
        <form onSubmit={submitPayment} className="flex flex-wrap items-end gap-2 border-t p-4">
          <label className="flex-1 space-y-1 text-sm">
            <span className="font-medium">Bank transfer reference</span>
            <Input
              required
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="From your bank app, after you send it"
            />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Mark as paid"}
          </Button>
        </form>
      )}
    </article>
  );
}
