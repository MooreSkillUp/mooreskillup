/**
 * Payouts, as the API returns them.
 *
 * Money stays a string end to end. These are decimals computed on the server,
 * and turning them into JavaScript floats to render them is how a total stops
 * matching the rows above it.
 */

export type PayoutStatus = "draft" | "approved" | "paid" | "carried";

export type LineStatus = "pending" | "payable" | "paid" | "reversed";

export interface EarningLine {
  id: string;
  course: string;
  paidAt: string;
  gross: string;
  processorFee: string;
  net: string;
  sharePercent: string;
  amount: string;
  qualifiesAt: string;
  period: string;
  status: LineStatus;
}

export interface Adjustment {
  id: string;
  kind: string;
  kindLabel: string;
  amount: string;
  reason: string;
}

export interface PayoutBank {
  onFile: boolean;
  verified: boolean;
  masked: string;
  bankName: string;
}

export interface Payout {
  id: string;
  teacherId: string;
  teacherName: string;
  period: string;
  linesTotal: string;
  adjustmentsTotal: string;
  amount: string;
  status: PayoutStatus;
  approvedBy: string;
  approvedAt: string | null;
  paidBy: string;
  paidAt: string | null;
  reference: string;
  note: string;
  lines: EarningLine[];
  adjustments: Adjustment[];
  bank: PayoutBank;
}

export interface PayoutRun {
  period: string;
  payouts: Payout[];
  totals: { owed: string; approved: string; paid: string; carried: string };
  periods: string[];
}

export const STATUS_LABEL: Record<PayoutStatus, string> = {
  draft: "Waiting for approval",
  approved: "Approved — transfer it and record the reference",
  paid: "Paid",
  carried: "Carried to next month",
};

export const STATUS_STYLE: Record<PayoutStatus, string> = {
  draft: "bg-warning/15 text-warning",
  approved: "bg-primary/10 text-primary",
  paid: "bg-success/15 text-success",
  carried: "bg-muted text-muted-foreground",
};

export const LINE_LABEL: Record<LineStatus, string> = {
  pending: "Inside the refund window",
  payable: "Payable",
  paid: "Paid",
  reversed: "Refunded — earns nothing",
};

export function naira(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function periodLabel(period: string): string {
  const [year, month] = period.split("-").map(Number);
  if (!year || !month) return period;
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function thisPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
