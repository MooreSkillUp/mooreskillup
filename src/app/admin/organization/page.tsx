"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Building2, Download, Users } from "lucide-react";

import { BankDialog } from "@/components/admin/organization/BankDialog";
import { DepartmentsTab } from "@/components/admin/organization/DepartmentsTab";
import { MembershipDialog } from "@/components/admin/organization/MembershipDialog";
import { TeamTab } from "@/components/admin/organization/TeamTab";
import type { Department, DepartmentList, TeamMember } from "@/components/admin/organization/types";
import { AppShell } from "@/components/dashboard/AppShell";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Button } from "@/components/ui-kit/Button";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useAuth } from "@/lib/auth";
import { authenticatedRequest, buildApiUrl } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

/**
 * The company's own shape: departments, their share of the operations pool,
 * their caps, and the people in them.
 *
 * Net revenue splits into a teacher share, a company reserve and an operations
 * pool; the pool divides across departments by percentage and is then capped.
 * This screen holds the inputs. The monthly calculation, the costs and the
 * payouts come later and read from what is entered here.
 */
export default function OrganizationPage() {
  const { user } = useAuth();
  const canView = hasUserPermission(user?.permissions, "departments:view");
  const canManageDepartments = hasUserPermission(user?.permissions, "departments:manage");
  const canViewTeam = hasUserPermission(user?.permissions, "team:view");
  const canManageTeam = hasUserPermission(user?.permissions, "team:manage");
  const canSeeBank = hasUserPermission(user?.permissions, "team:bank-details");
  const canExport = hasUserPermission(user?.permissions, "team:export");
  const { notifyError } = useFeedback();

  const [tab, setTab] = useState<"departments" | "team">("departments");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [poolTotal, setPoolTotal] = useState("0.00");
  const [balanced, setBalanced] = useState(true);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [membershipFor, setMembershipFor] = useState<TeamMember | null>(null);
  const [bankFor, setBankFor] = useState<TeamMember | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await authenticatedRequest<DepartmentList>("/api/admin/departments/");
      setDepartments(list.results);
      setPoolTotal(list.poolPercentTotal);
      setBalanced(list.poolPercentBalanced);
      if (canViewTeam) {
        setMembers(await authenticatedRequest<TeamMember[]>("/api/admin/team-members/"));
      }
    } catch (failure) {
      notifyError("Could not load the structure", failure instanceof Error ? failure.message : "");
    } finally {
      setLoading(false);
    }
  }, [canViewTeam, notifyError]);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  const activeMembers = useMemo(() => members.filter((m) => m.status === "active"), [members]);

  if (!canView) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel title="You do not have access to the company structure" />
      </AppShell>
    );
  }

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Company structure</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Departments take a share of the operations pool and are then capped. This is what the
              monthly split is calculated from.
            </p>
          </div>
          {canExport && (
            <a href={buildApiUrl("/api/admin/organization/export/")} download>
              <Button variant="outline" type="button">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </a>
          )}
        </header>

        {!balanced && (
          <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>
              The active departments add up to <strong>{poolTotal}%</strong> of the operations pool,
              not 100%. That is fine while you are still editing — but the split will not distribute
              the whole pool until it balances.
            </p>
          </div>
        )}

        <div className="flex gap-1 border-b">
          <button
            type="button"
            onClick={() => setTab("departments")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
              tab === "departments"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Departments
          </button>
          {canViewTeam && (
            <button
              type="button"
              onClick={() => setTab("team")}
              className={`flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium ${
                tab === "team"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground"
              }`}
            >
              <Users className="h-4 w-4" />
              Team
            </button>
          )}
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && tab === "departments" && (
          <DepartmentsTab
            departments={departments}
            memberOptions={activeMembers}
            canManage={canManageDepartments}
            reload={load}
          />
        )}

        {!loading && tab === "team" && canViewTeam && (
          <TeamTab
            members={members}
            canManage={canManageTeam}
            canSeeBank={canSeeBank}
            reload={load}
            onAddToDepartment={setMembershipFor}
            onOpenBank={setBankFor}
          />
        )}

        {membershipFor && canManageTeam && (
          <MembershipDialog
            member={membershipFor}
            departments={departments}
            onClose={() => setMembershipFor(null)}
            reload={load}
          />
        )}

        {bankFor && canSeeBank && (
          <BankDialog member={bankFor} onClose={() => setBankFor(null)} reload={load} />
        )}
      </div>
    </AppShell>
  );
}
