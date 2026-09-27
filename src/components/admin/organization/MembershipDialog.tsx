"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

import type { Department, ShareBasis, TeamMember } from "./types";

const EMPTY = {
  departmentId: "",
  isLead: false,
  shareBasis: "none" as ShareBasis,
  shareValue: "0",
  monthlyCap: "",
};

interface Props {
  member: TeamMember;
  departments: Department[];
  onClose: () => void;
  reload: () => Promise<void>;
}

/** Puts one person in one department, with what they take from it. */
export function MembershipDialog({ member, departments, onClose, reload }: Props) {
  const { notifySuccess, notifyError } = useFeedback();
  const [draft, setDraft] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await authenticatedRequest("/api/admin/department-memberships/", {
        method: "POST",
        body: JSON.stringify({
          teamMemberId: member.id,
          departmentId: draft.departmentId,
          isLead: draft.isLead,
          shareBasis: draft.shareBasis,
          shareValue: draft.shareValue || "0",
          monthlyCap: draft.monthlyCap === "" ? null : draft.monthlyCap,
        }),
      });
      notifySuccess("Added", `${member.fullName} joined the department.`);
      onClose();
      await reload();
    } catch (failure) {
      notifyError("Could not add", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="w-full max-w-lg space-y-4 rounded-lg border bg-background p-5"
      >
        <h2 className="font-semibold">Put {member.fullName} in a department</h2>

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
                {d.isSubDepartment ? `— ${d.name}` : d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.isLead}
            onChange={(e) => setDraft({ ...draft, isLead: e.target.checked })}
          />
          They lead this department
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">What they take</span>
            <select
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              value={draft.shareBasis}
              onChange={(e) => setDraft({ ...draft, shareBasis: e.target.value as ShareBasis })}
            >
              <option value="none">Nothing standing — volunteer or ad hoc</option>
              <option value="percent_of_department">A percent of the department</option>
              <option value="fixed">A fixed monthly amount</option>
            </select>
          </label>

          <label className="space-y-1 text-sm">
            <span className="font-medium">{draft.shareBasis === "fixed" ? "Amount" : "Percent"}</span>
            <Input
              type="number"
              min="0"
              step="0.01"
              disabled={draft.shareBasis === "none"}
              value={draft.shareValue}
              onChange={(e) => setDraft({ ...draft, shareValue: e.target.value })}
            />
          </label>
        </div>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Their cap for this department</span>
          <Input
            type="number"
            min="0"
            value={draft.monthlyCap}
            onChange={(e) => setDraft({ ...draft, monthlyCap: e.target.value })}
            placeholder="Leave empty for no cap"
          />
          <span className="block text-xs text-muted-foreground">
            The most they may draw from it in a month, leads included.
          </span>
        </label>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Add"}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
