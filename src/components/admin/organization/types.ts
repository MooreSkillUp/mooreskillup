/**
 * Shared shapes for the company-structure screens.
 *
 * Departments take a share of the operations pool and are then capped; the
 * people in them carry a pay basis per department, because the same person may
 * take a share of one and nothing in another.
 */

export type ShareBasis = "percent_of_department" | "fixed" | "none";

export interface DepartmentChild {
  id: string;
  name: string;
  memberCount: number;
}

export interface Department {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  percentOfPool: string;
  monthlyCap: string | null;
  isCostFloor: boolean;
  leadId: string | null;
  leadName: string;
  remit: string;
  isActive: boolean;
  order: number;
  isSubDepartment: boolean;
  memberCount: number;
  children: DepartmentChild[];
}

export interface DepartmentList {
  results: Department[];
  poolPercentTotal: string;
  poolPercentBalanced: boolean;
}

export interface MemberDepartment {
  id: string;
  name: string;
  isLead: boolean;
  shareBasis: ShareBasis;
  shareValue: string;
  monthlyCap: string | null;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleTitle: string;
  status: "active" | "inactive" | "left";
  joinedOn: string | null;
  agreementVersion: string;
  agreementSignedOn: string | null;
  notes: string;
  accountName: string;
  bankName: string;
  accountNumberMasked: string;
  hasBankDetails: boolean;
  bankVerifiedAt: string | null;
  isLead: boolean;
  departments: MemberDepartment[];
}

export interface BankChange {
  field: string;
  from: string;
  to: string;
  at: string;
  by: string;
}

export interface BankDetails {
  accountName: string;
  bankName: string;
  accountNumber: string;
  verifiedAt: string | null;
  changes: BankChange[];
}

export const BASIS_LABEL: Record<ShareBasis, string> = {
  percent_of_department: "% of department",
  fixed: "Fixed amount",
  none: "Nothing standing",
};

export const STATUS_STYLE: Record<TeamMember["status"], string> = {
  active: "bg-success/15 text-success",
  inactive: "bg-muted text-muted-foreground",
  left: "bg-destructive/10 text-destructive",
};

export function naira(value: string | null): string {
  if (value === null || value === "") return "—";
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
}

export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** What a person takes from one department, in words. */
export function shareSummary(department: MemberDepartment): string {
  const base =
    department.shareBasis === "none"
      ? BASIS_LABEL.none
      : department.shareBasis === "fixed"
        ? naira(department.shareValue)
        : `${department.shareValue}% of department`;
  return department.monthlyCap ? `${base} · capped at ${naira(department.monthlyCap)}` : base;
}
