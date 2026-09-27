"use client";

import { useState, type FormEvent } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

import { COST_CATEGORIES, naira, type CostEntry } from "./types";

interface Department {
  id: string;
  name: string;
}

interface Props {
  month: string;
  costs: CostEntry[];
  departments: Department[];
  canEdit: boolean;
  closed: boolean;
  reload: () => Promise<void>;
}

const EMPTY = { departmentId: "", category: "hosting", amount: "", vendor: "", note: "" };

/**
 * What the month actually cost, entered against the department whose work
 * caused it.
 *
 * Not an accounting package: one figure per category per month. It exists
 * because the infrastructure floor cannot run without knowing the real bill,
 * and because seeing what MooreSkillUp costs beside what it earns is worth
 * more than any report.
 */
export function CostsPanel({ month, costs, departments, canEdit, closed, reload }: Props) {
  const { notifySuccess, notifyError } = useFeedback();
  const [draft, setDraft] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const total = costs.reduce((sum, cost) => sum + Number(cost.amount), 0);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await authenticatedRequest("/api/admin/costs/", {
        method: "POST",
        body: JSON.stringify({
          month: `${month}-01`,
          departmentId: draft.departmentId,
          category: draft.category,
          amount: draft.amount,
          vendor: draft.vendor,
          note: draft.note,
        }),
      });
      notifySuccess("Cost recorded", `${naira(draft.amount)} against this month.`);
      setDraft(EMPTY);
      setShowForm(false);
      await reload();
    } catch (failure) {
      notifyError("Could not save", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (cost: CostEntry) => {
    if (!window.confirm(`Remove ${naira(cost.amount)} from ${cost.departmentName}?`)) return;
    try {
      await authenticatedRequest(`/api/admin/costs/${cost.id}/`, { method: "DELETE" });
      notifySuccess("Removed", "The split has been recalculated.");
      await reload();
    } catch (failure) {
      notifyError("Could not remove", failure instanceof Error ? failure.message : "");
    }
  };

  return (
    <section className="space-y-4">
      {closed && (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          This month is closed, so its costs can no longer be changed. Record anything that arrives
          late against the current month.
        </p>
      )}

      {canEdit && !closed && !showForm && (
        <Button type="button" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Record a cost
        </Button>
      )}

      {showForm && canEdit && !closed && (
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Department</span>
              <select
                required
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={draft.departmentId}
                onChange={(e) => setDraft({ ...draft, departmentId: e.target.value })}
              >
                <option value="">Choose one</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">What kind</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={draft.category}
                onChange={(e) => setDraft({ ...draft, category: e.target.value })}
              >
                {COST_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Amount</span>
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={draft.amount}
                onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Who it was paid to</span>
              <Input
                value={draft.vendor}
                onChange={(e) => setDraft({ ...draft, vendor: e.target.value })}
                placeholder="Azure, Vercel, Brevo…"
              />
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Record it"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setDraft(EMPTY);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {costs.length === 0 ? (
        <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing recorded for this month. Until the hosting bill is entered, the infrastructure
          floor has no figure to work from.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Paid to</th>
                <th className="px-4 py-3 text-right">Amount</th>
                {canEdit && !closed && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {costs.map((cost) => (
                <tr key={cost.id} className="border-t">
                  <td className="px-4 py-3">{cost.departmentName}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {COST_CATEGORIES.find((c) => c.value === cost.category)?.label ?? cost.category}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{cost.vendor || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{naira(cost.amount)}</td>
                  {canEdit && !closed && (
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(cost)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t bg-muted/40 font-medium">
                <td className="px-4 py-3" colSpan={3}>
                  Total for the month
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{naira(String(total))}</td>
                {canEdit && !closed && <td />}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
