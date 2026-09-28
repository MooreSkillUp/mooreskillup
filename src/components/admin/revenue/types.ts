/**
 * The monthly split, as the API returns it.
 *
 * Every money figure is a string, not a number: these are decimals computed on
 * the server, and turning them into JavaScript floats to render them is how a
 * total stops matching the rows above it.
 */

export interface Allocation {
  departmentId: string;
  department: string;
  isCostFloor: boolean;
  percentUsed: string;
  calculated: string;
  capApplied: string | null;
  costTotal: string;
  actual: string;
  reserveDraw: string;
  excessReturned: string;
}

export interface TeacherSale {
  course: string;
  paidAt: string;
  amount: string;
  fee: string;
  sharePercent: string;
  earned: string;
}

export interface TeacherEarnings {
  teacherId: string | null;
  name: string;
  total: string;
  sales: TeacherSale[];
}

export interface UnearnedSale {
  course: string;
  paidAt: string;
  amount: string;
  reason: string;
}

export interface RevenueSplit {
  month: string;
  status: "open" | "closed";
  live: boolean;
  gross: string;
  processorFees: string;
  netRevenue: string;
  teacherTotal: string;
  operationsPool: string;
  reserveAmount: string;
  saleCount: number;
  salesMissingFee: number;
  operationsPercentUsed: string;
  allocations: Allocation[];
  months: string[];
  teachers: TeacherEarnings[];
  unearned: UnearnedSale[];
}

export interface CostEntry {
  id: string;
  month: string;
  departmentId: string;
  departmentName: string;
  category: string;
  amount: string;
  vendor: string;
  note: string;
  enteredBy: string;
}

export const COST_CATEGORIES: ReadonlyArray<{ value: string; label: string }> = [
  { value: "hosting", label: "Hosting and servers" },
  { value: "database", label: "Database" },
  { value: "storage", label: "Storage" },
  { value: "video", label: "Video" },
  { value: "email", label: "Email" },
  { value: "domain", label: "Domain and DNS" },
  { value: "tools", label: "Tools and subscriptions" },
  { value: "ad_spend", label: "Advertising" },
  { value: "equipment", label: "Equipment" },
  { value: "transport", label: "Transport" },
  { value: "data", label: "Data and airtime" },
  { value: "other", label: "Other" },
];

/** ₦ with thousands separators. Negative reserves keep their minus sign. */
export function naira(value: string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function monthLabel(value: string): string {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function thisMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
