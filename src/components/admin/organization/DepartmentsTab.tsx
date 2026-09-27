"use client";

import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

import { naira, type Department, type TeamMember } from "./types";

const EMPTY = {
  name: "",
  parentId: "",
  percentOfPool: "0",
  monthlyCap: "",
  isCostFloor: false,
  leadId: "",
  remit: "",
};

interface Props {
  departments: Department[];
  memberOptions: TeamMember[];
  canManage: boolean;
  reload: () => Promise<void>;
}

export function DepartmentsTab({ departments, memberOptions, canManage, reload }: Props) {
  const { notifySuccess, notifyError } = useFeedback();
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState<Department | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const topLevel = departments.filter((d) => !d.isSubDepartment);
  const isSub = draft.parentId !== "";

  const startEdit = (department: Department) => {
    setEditing(department);
    setDraft({
      name: department.name,
      parentId: department.parentId ?? "",
      percentOfPool: department.percentOfPool,
      monthlyCap: department.monthlyCap ?? "",
      isCostFloor: department.isCostFloor,
      leadId: department.leadId ?? "",
      remit: department.remit,
    });
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setEditing(null);
    setDraft(EMPTY);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const body = {
      name: draft.name,
      parentId: draft.parentId || null,
      percentOfPool: draft.percentOfPool || "0",
      monthlyCap: draft.monthlyCap === "" ? null : draft.monthlyCap,
      isCostFloor: draft.isCostFloor,
      leadId: draft.leadId || null,
      remit: draft.remit,
    };
    try {
      if (editing) {
        await authenticatedRequest(`/api/admin/departments/${editing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        notifySuccess("Saved", `${body.name} is up to date.`);
      } else {
        await authenticatedRequest("/api/admin/departments/", {
          method: "POST",
          body: JSON.stringify(body),
        });
        notifySuccess("Department added", body.name);
      }
      close();
      await reload();
    } catch (failure) {
      notifyError("Could not save", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (department: Department) => {
    const confirmed = window.confirm(
      `Remove ${department.name}? Its members stay, but their place in it goes.`,
    );
    if (!confirmed) return;
    try {
      await authenticatedRequest(`/api/admin/departments/${department.id}/`, { method: "DELETE" });
      notifySuccess("Removed", department.name);
      await reload();
    } catch (failure) {
      notifyError("Could not remove", failure instanceof Error ? failure.message : "");
    }
  };

  return (
    <section className="space-y-4">
      {canManage && !showForm && (
        <Button type="button" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add a department
        </Button>
      )}

      {showForm && canManage && (
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Name</span>
              <Input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Technology and Product"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Sits under</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={draft.parentId}
                onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
              >
                <option value="">Nothing — a department of its own</option>
                {topLevel
                  .filter((d) => d.id !== editing?.id)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Share of the operations pool</span>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                disabled={isSub}
                value={draft.percentOfPool}
                onChange={(e) => setDraft({ ...draft, percentOfPool: e.target.value })}
              />
              <span className="block text-xs text-muted-foreground">
                {isSub
                  ? "A sub-department is paid out of its parent's allocation, so it takes no share of its own."
                  : "Percent. The top-level departments should add up to 100."}
              </span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Monthly cap</span>
              <Input
                type="number"
                min="0"
                value={draft.monthlyCap}
                onChange={(e) => setDraft({ ...draft, monthlyCap: e.target.value })}
                placeholder="Leave empty for no cap"
              />
              <span className="block text-xs text-muted-foreground">
                The most it may draw in a month. Anything above goes back to the reserve.
              </span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Lead</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={draft.leadId}
                onChange={(e) => setDraft({ ...draft, leadId: e.target.value })}
              >
                <option value="">Nobody yet</option>
                {memberOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <span className="block text-xs text-muted-foreground">
                One person can lead more than one department.
              </span>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">What it covers</span>
              <Input
                value={draft.remit}
                onChange={(e) => setDraft({ ...draft, remit: e.target.value })}
                placeholder="Backend, frontend, deploys, security"
              />
            </label>
          </div>

          {!isSub && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={draft.isCostFloor}
                onChange={(e) => setDraft({ ...draft, isCostFloor: e.target.checked })}
              />
              <span>
                <span className="font-medium">Its bills come first</span>
                <span className="block text-xs text-muted-foreground">
                  Takes the higher of its share or the month&apos;s actual cost, with any shortfall
                  drawn from the reserve. For Infrastructure, whose bill arrives whether or not the
                  percentage covers it.
                </span>
              </span>
            </label>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add department"}
            </Button>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3 text-right">Share</th>
              <th className="px-4 py-3 text-right">Cap</th>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3 text-right">People</th>
              {canManage && <th className="px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {departments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No departments yet. Add the first one to start the structure.
                </td>
              </tr>
            )}
            {departments.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-4 py-3">
                  <div className={d.isSubDepartment ? "pl-5" : ""}>
                    <span className="font-medium">{d.name}</span>
                    {d.isCostFloor && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        bills first
                      </span>
                    )}
                    {!d.isActive && (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        inactive
                      </span>
                    )}
                    {d.remit && (
                      <span className="block text-xs text-muted-foreground">{d.remit}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {d.isSubDepartment ? (
                    <span className="text-xs text-muted-foreground">from parent</span>
                  ) : (
                    `${d.percentOfPool}%`
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{naira(d.monthlyCap)}</td>
                <td className="px-4 py-3">{d.leadName || "—"}</td>
                <td className="px-4 py-3 text-right tabular-nums">{d.memberCount}</td>
                {canManage && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={() => startEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => remove(d)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
