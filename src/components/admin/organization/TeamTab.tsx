"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle, Building2, Landmark, Pencil, Plus, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

import { shareSummary, shortDate, STATUS_STYLE, type TeamMember } from "./types";

const EMPTY = {
  fullName: "",
  email: "",
  phone: "",
  roleTitle: "",
  status: "active" as TeamMember["status"],
  joinedOn: "",
  agreementVersion: "",
  agreementSignedOn: "",
  notes: "",
};

interface Props {
  members: TeamMember[];
  canManage: boolean;
  canSeeBank: boolean;
  reload: () => Promise<void>;
  onAddToDepartment: (member: TeamMember) => void;
  onOpenBank: (member: TeamMember) => void;
}

export function TeamTab({
  members,
  canManage,
  canSeeBank,
  reload,
  onAddToDepartment,
  onOpenBank,
}: Props) {
  const { notifySuccess, notifyError } = useFeedback();
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const startEdit = (member: TeamMember) => {
    setEditing(member);
    setDraft({
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      roleTitle: member.roleTitle,
      status: member.status,
      joinedOn: member.joinedOn ?? "",
      agreementVersion: member.agreementVersion,
      agreementSignedOn: member.agreementSignedOn ?? "",
      notes: member.notes,
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
      fullName: draft.fullName,
      email: draft.email,
      phone: draft.phone,
      roleTitle: draft.roleTitle,
      status: draft.status,
      joinedOn: draft.joinedOn || null,
      agreementVersion: draft.agreementVersion,
      agreementSignedOn: draft.agreementSignedOn || null,
      notes: draft.notes,
    };
    try {
      if (editing) {
        await authenticatedRequest(`/api/admin/team-members/${editing.id}/`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        notifySuccess("Saved", `${body.fullName} is up to date.`);
      } else {
        await authenticatedRequest("/api/admin/team-members/", {
          method: "POST",
          body: JSON.stringify(body),
        });
        notifySuccess("Added to the team", body.fullName);
      }
      close();
      await reload();
    } catch (failure) {
      notifyError("Could not save", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-4">
      {canManage && !showForm && (
        <Button type="button" onClick={() => setShowForm(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add someone
        </Button>
      )}

      {showForm && canManage && (
        <form onSubmit={submit} className="space-y-4 rounded-lg border bg-card p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Name</span>
              <Input
                required
                value={draft.fullName}
                onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Role</span>
              <Input
                value={draft.roleTitle}
                onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })}
                placeholder="Social Media Manager"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Phone</span>
              <Input
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Email</span>
              <Input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Status</span>
              <select
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={draft.status}
                onChange={(e) =>
                  setDraft({ ...draft, status: e.target.value as TeamMember["status"] })
                }
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="left">Left</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Joined</span>
              <Input
                type="date"
                value={draft.joinedOn}
                onChange={(e) => setDraft({ ...draft, joinedOn: e.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Agreement version</span>
              <Input
                value={draft.agreementVersion}
                onChange={(e) => setDraft({ ...draft, agreementVersion: e.target.value })}
                placeholder="v1.0"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Agreement signed on</span>
              <Input
                type="date"
                value={draft.agreementSignedOn}
                onChange={(e) => setDraft({ ...draft, agreementSignedOn: e.target.value })}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : editing ? "Save changes" : "Add to the team"}
            </Button>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {members.length === 0 && (
          <p className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
            Nobody added yet.
          </p>
        )}

        {members.map((member) => (
          <article key={member.id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{member.fullName}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[member.status]}`}>
                    {member.status}
                  </span>
                  {member.isLead && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      lead
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {[member.roleTitle, member.phone, member.email].filter(Boolean).join(" · ") ||
                    "—"}
                </p>
                {member.agreementSignedOn && (
                  <p className="text-xs text-muted-foreground">
                    Agreement {member.agreementVersion} signed {shortDate(member.agreementSignedOn)}
                  </p>
                )}
              </div>

              <div className="flex gap-1">
                {canSeeBank && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenBank(member)}
                    title="Where they are paid"
                  >
                    <Landmark
                      className={`h-4 w-4 ${
                        member.bankVerifiedAt ? "text-success" : "text-muted-foreground"
                      }`}
                    />
                  </Button>
                )}
                {canManage && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddToDepartment(member)}
                      title="Put them in a department"
                    >
                      <Building2 className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => startEdit(member)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {member.departments.length > 0 && (
              <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                {member.departments.map((department) => (
                  <li key={department.id} className="flex flex-wrap justify-between gap-2">
                    <span>
                      {department.name}
                      {department.isLead && (
                        <span className="ml-2 text-xs text-primary">leads it</span>
                      )}
                    </span>
                    <span className="tabular-nums text-muted-foreground">
                      {shareSummary(department)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {canSeeBank && (
              <p className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs text-muted-foreground">
                <Landmark className="h-3.5 w-3.5" />
                {member.hasBankDetails
                  ? `${member.bankName} ${member.accountNumberMasked}`
                  : "No bank details on file"}
                {member.hasBankDetails &&
                  (member.bankVerifiedAt ? (
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
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
