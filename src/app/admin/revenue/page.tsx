"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, Lock, Receipt, Users } from "lucide-react";

import { AllocationsTable } from "@/components/admin/revenue/AllocationsTable";
import { CostsPanel } from "@/components/admin/revenue/CostsPanel";
import { SplitSummary } from "@/components/admin/revenue/SplitSummary";
import { TeachersPanel } from "@/components/admin/revenue/TeachersPanel";
import {
  monthLabel,
  thisMonth,
  type CostEntry,
  type RevenueSplit,
} from "@/components/admin/revenue/types";
import { AppShell } from "@/components/dashboard/AppShell";
import { NoAccessPanel } from "@/components/shared/NoAccessPanel";
import { Button } from "@/components/ui-kit/Button";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useAuth } from "@/lib/auth";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

interface DepartmentOption {
  id: string;
  name: string;
}

/**
 * The monthly split: what came in, what it cost, and where the rest went.
 *
 * An open month is recalculated on the server every time this loads, so the
 * figures move as sales come in. Closing freezes them, and nothing — not a
 * later sale, not a late cost, not an edited percentage — changes them again.
 */
export default function RevenuePage() {
  const { user } = useAuth();
  const canView = hasUserPermission(user?.permissions, "payments:view");
  const canClose = hasUserPermission(user?.permissions, "payments:refund");
  const canEditCosts = hasUserPermission(user?.permissions, "campaigns:manage");
  const { notifySuccess, notifyError } = useFeedback();

  const [month, setMonth] = useState(thisMonth());
  const [split, setSplit] = useState<RevenueSplit | null>(null);
  const [costs, setCosts] = useState<CostEntry[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [tab, setTab] = useState<"departments" | "teachers" | "costs">("departments");
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, costList] = await Promise.all([
        authenticatedRequest<RevenueSplit>(`/api/admin/revenue-split/?month=${month}`),
        authenticatedRequest<CostEntry[]>(`/api/admin/costs/?month=${month}`),
      ]);
      setSplit(data);
      setCosts(costList);
    } catch (failure) {
      notifyError("Could not load the month", failure instanceof Error ? failure.message : "");
    } finally {
      setLoading(false);
    }
  }, [month, notifyError]);

  const loadDepartments = useCallback(async () => {
    try {
      const list = await authenticatedRequest<{ results: DepartmentOption[] }>(
        "/api/admin/departments/?active=true",
      );
      setDepartments(list.results.map((d) => ({ id: d.id, name: d.name })));
    } catch {
      // Not fatal: the split still renders, only the cost form loses its list.
      setDepartments([]);
    }
  }, []);

  useEffect(() => {
    if (canView) void load();
  }, [canView, load]);

  useEffect(() => {
    if (canView) void loadDepartments();
  }, [canView, loadDepartments]);

  const monthOptions = useMemo(() => {
    const known = new Set(split?.months ?? []);
    known.add(month);
    known.add(thisMonth());
    return [...known].sort().reverse();
  }, [split?.months, month]);

  if (!canView) {
    return (
      <AppShell allowedRoles={["admin"]}>
        <NoAccessPanel title="You do not have access to the revenue split" />
      </AppShell>
    );
  }

  const closeMonth = async () => {
    if (!split) return;
    const confirmed = window.confirm(
      `Close ${monthLabel(month)}?\n\nThe figures are frozen exactly as they stand and cannot be ` +
        `changed afterwards — not by a later sale, a late cost, or an edited percentage. There is ` +
        `no reopening it.`,
    );
    if (!confirmed) return;
    setClosing(true);
    try {
      await authenticatedRequest("/api/admin/revenue-split/", {
        method: "POST",
        body: JSON.stringify({ month }),
      });
      notifySuccess("Closed", `${monthLabel(month)} is final.`);
      await load();
    } catch (failure) {
      notifyError("Could not close", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setClosing(false);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Revenue split</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              What came in, what the processor took, what the teachers earned, and how the rest
              divides across the departments.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            >
              {monthOptions.map((value) => (
                <option key={value} value={value}>
                  {monthLabel(value)}
                </option>
              ))}
            </select>
            {canClose && split?.status === "open" && (
              <Button type="button" variant="outline" onClick={closeMonth} disabled={closing}>
                <Lock className="mr-2 h-4 w-4" />
                {closing ? "Closing…" : "Close month"}
              </Button>
            )}
          </div>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && split && (
          <>
            <SplitSummary split={split} />

            <div className="flex gap-1 overflow-x-auto border-b">
              <TabButton
                active={tab === "departments"}
                onClick={() => setTab("departments")}
                icon={<Building2 className="h-4 w-4" />}
                label="Departments"
              />
              <TabButton
                active={tab === "teachers"}
                onClick={() => setTab("teachers")}
                icon={<Users className="h-4 w-4" />}
                label="Teachers"
              />
              <TabButton
                active={tab === "costs"}
                onClick={() => setTab("costs")}
                icon={<Receipt className="h-4 w-4" />}
                label="Costs"
              />
            </div>

            {tab === "departments" && <AllocationsTable allocations={split.allocations} />}
            {tab === "teachers" && <TeachersPanel split={split} />}
            {tab === "costs" && (
              <CostsPanel
                month={month}
                costs={costs}
                departments={departments}
                canEdit={canEditCosts}
                closed={split.status === "closed"}
                reload={load}
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium ${
        active ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
