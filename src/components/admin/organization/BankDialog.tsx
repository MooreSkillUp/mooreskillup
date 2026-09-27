"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { authenticatedRequest } from "@/lib/authenticated-api";
import { useFeedback } from "@/lib/feedback";

import { shortDate, type BankDetails, type TeamMember } from "./types";

interface Props {
  member: TeamMember;
  onClose: () => void;
  reload: () => Promise<void>;
}

/**
 * Where one person is paid.
 *
 * Deliberately awkward: it opens one person at a time, the number is hidden
 * until asked for, every change is recorded and clears verification, and
 * confirming the details is a separate action from entering them. Moving where
 * money goes should not be something anyone does by accident.
 */
export function BankDialog({ member, onClose, reload }: Props) {
  const { notifySuccess, notifyError } = useFeedback();
  const [details, setDetails] = useState<BankDetails | null>(null);
  const [draft, setDraft] = useState({ accountName: "", bankName: "", accountNumber: "" });
  const [showNumber, setShowNumber] = useState(false);
  const [saving, setSaving] = useState(false);

  const endpoint = `/api/admin/team-members/${member.id}/bank-details/`;

  const open = useCallback(async () => {
    try {
      const loaded = await authenticatedRequest<BankDetails>(endpoint);
      setDetails(loaded);
      setDraft({
        accountName: loaded.accountName,
        bankName: loaded.bankName,
        accountNumber: loaded.accountNumber,
      });
    } catch (failure) {
      notifyError("Could not open", failure instanceof Error ? failure.message : "");
      onClose();
    }
  }, [endpoint, notifyError, onClose]);

  useEffect(() => {
    void open();
  }, [open]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await authenticatedRequest<{ changed: string[] }>(endpoint, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      if (result.changed.length === 0) {
        notifySuccess("Nothing changed", "The details on file already match.");
      } else {
        notifySuccess(
          "Saved",
          "Verification was cleared. Check the details, then mark them verified.",
        );
      }
      onClose();
      await reload();
    } catch (failure) {
      notifyError("Could not save", failure instanceof Error ? failure.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const verify = async () => {
    try {
      await authenticatedRequest(endpoint, { method: "POST", body: JSON.stringify({}) });
      notifySuccess("Verified", `${member.fullName}'s details are confirmed.`);
      onClose();
      await reload();
    } catch (failure) {
      notifyError("Could not verify", failure instanceof Error ? failure.message : "");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <form
        onSubmit={save}
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border bg-background p-5"
      >
        <div>
          <h2 className="font-semibold">Where {member.fullName} is paid</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Changing any of this clears verification and is recorded. Opening this page is recorded
            too.
          </p>
        </div>

        {details === null ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Account name</span>
              <Input
                value={draft.accountName}
                onChange={(e) => setDraft({ ...draft, accountName: e.target.value })}
                placeholder="Exactly as the bank has it"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Bank</span>
              <Input
                value={draft.bankName}
                onChange={(e) => setDraft({ ...draft, bankName: e.target.value })}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Account number</span>
              <div className="flex gap-2">
                <Input
                  type={showNumber ? "text" : "password"}
                  inputMode="numeric"
                  value={draft.accountNumber}
                  onChange={(e) => setDraft({ ...draft, accountNumber: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={() => setShowNumber((s) => !s)}>
                  {showNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </label>

            {details.changes.length > 0 && (
              <div className="rounded-md border bg-muted/40 p-3">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  What has changed
                </h3>
                <ul className="mt-2 space-y-1 text-xs">
                  {details.changes.map((change, index) => (
                    <li key={index} className="flex justify-between gap-2">
                      <span>
                        {change.field.replace(/_/g, " ")}: {change.from || "empty"} →{" "}
                        {change.to || "empty"}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {shortDate(change.at)}
                        {change.by ? ` · ${change.by}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
              {member.hasBankDetails && !details.verifiedAt && (
                <Button type="button" variant="outline" onClick={verify}>
                  <Check className="mr-2 h-4 w-4" />
                  These are right — verify
                </Button>
              )}
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
