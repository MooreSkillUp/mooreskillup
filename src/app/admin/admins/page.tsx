"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { KeyRound, Mail, ScrollText, Shield, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { CredentialHandoff, type Handoff } from "@/components/admin/CredentialHandoff";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { rolePermissionMap, hasUserPermission, type AdminRole } from "@/lib/admin-rbac";
import {
  ADMIN_TIER_DESCRIPTIONS,
  ADMIN_TIER_LABELS,
  useAdminTeam,
  type AdminTeamMember,
  type AdminTierCode,
} from "@/lib/admin-team";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

const TIERS: AdminTierCode[] = ["moderator", "admin", "super_admin"];

/** High-impact permissions a Super Admin can grant or revoke per admin. */
const OVERRIDABLE: { action: string; label: string }[] = [
  { action: "payments:refund", label: "Issue refunds" },
  { action: "courses:delete", label: "Approve course deletions" },
  { action: "teachers:delete", label: "Delete teachers" },
  { action: "students:delete", label: "Delete students" },
  { action: "categories:delete", label: "Delete categories" },
  { action: "admin-settings:edit", label: "Edit platform settings" },
  { action: "activity-logs:view", label: "View activity logs" },
  { action: "activity-logs:export", label: "Export activity logs" },
];

/** Display only: whether a tier includes a permission by default. */
function tierIncludes(tier: AdminTierCode, action: string) {
  const key = (tier === "super_admin" ? "super-admin" : tier) as AdminRole;
  return (rolePermissionMap[key] as string[]).includes(action);
}

function ago(iso?: string | null) {
  if (!iso) return null;
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

type Confirmation =
  | { kind: "rank"; member: AdminTeamMember; tier: AdminTierCode }
  | { kind: "deactivate" | "resend" | "remove"; member: AdminTeamMember };

/**
 * The admin team: who can do what, and the controls that change it.
 *
 * Rank used to be a bare dropdown that applied on change — one slip promoted
 * someone to Super Admin. Resend reset a password into an email nobody got.
 * Every account said "Never signed in", because sign-ins weren't recorded. And
 * permission toggles worked out their grant/revoke from a frontend copy of the
 * permission matrix, so the copy drifting from the backend would have granted
 * or revoked the wrong thing. Each of those is fixed here.
 */
export default function AdminTeamPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const { admins, isLoading, error, createAdmin, updateAdmin, deleteAdmin, resendCredentials, updatePermissions } =
    useAdminTeam();

  const canView = hasUserPermission(user?.permissions, "admins:view");
  const canCreate = hasUserPermission(user?.permissions, "admins:create");
  const canEdit = hasUserPermission(user?.permissions, "admins:edit");
  const canDelete = hasUserPermission(user?.permissions, "admins:delete");
  const canManagePermissions = hasUserPermission(user?.permissions, "permissions:manage");

  const [showCreate, setShowCreate] = useState(false);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [permissionsFor, setPermissionsFor] = useState<string | null>(null);

  const run = async (key: string, action: () => Promise<void>, failure: string) => {
    setBusyId(key);
    try {
      await action();
    } catch (actionError) {
      notifyError(failure, actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setBusyId(null);
    }
  };

  const togglePermission = (member: AdminTeamMember, action: string, enable: boolean) => {
    // Adjust only this action's override. Enabling clears a revoke and adds a
    // grant; disabling clears a grant and adds a revoke. Effective permissions
    // are (tier ∪ grant) − revoke on the server, so this is right whatever the
    // tier contains — no frontend copy of the matrix is consulted.
    const grant = new Set(member.permissionOverrides?.grant ?? []);
    const revoke = new Set(member.permissionOverrides?.revoke ?? []);
    if (enable) {
      revoke.delete(action);
      grant.add(action);
    } else {
      grant.delete(action);
      revoke.add(action);
    }
    void run(
      `${member.id}:permissions`,
      async () => {
        await updatePermissions(member.id, { grant: [...grant], revoke: [...revoke] });
        notifySuccess("Permissions updated", `${member.displayName}'s access changed.`);
      },
      "Could not update permissions",
    );
  };

  const confirm = async () => {
    if (!confirmation) return;
    const { member } = confirmation;
    await run(
      `${member.id}:${confirmation.kind}`,
      async () => {
        if (confirmation.kind === "rank") {
          await updateAdmin(member.id, { adminRole: confirmation.tier });
          notifySuccess(`${member.displayName} is now ${ADMIN_TIER_LABELS[confirmation.tier]}`);
        } else if (confirmation.kind === "deactivate") {
          await updateAdmin(member.id, { status: "disabled" });
          notifySuccess(`${member.displayName} deactivated`, "They've been signed out everywhere.");
        } else if (confirmation.kind === "resend") {
          const result = await resendCredentials(member.id);
          if (result.temporaryPassword) {
            setHandoff({
              email: member.email,
              password: result.temporaryPassword,
              context: `A new password was set for ${member.displayName}. The old one no longer works.`,
            });
          }
          notifySuccess("New sign-in details", result.detail);
        } else {
          await deleteAdmin(member.id);
          notifySuccess(`${member.displayName} deleted`, "Their audit trail is kept.");
        }
        setConfirmation(null);
      },
      "Could not complete that",
    );
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin team</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading ? "Loading…" : `${admins.length} ${admins.length === 1 ? "member" : "members"}`}
            </p>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>
          {canCreate && (
            <Button variant="accent" className="shrink-0" onClick={() => setShowCreate((value) => !value)}>
              <UserPlus className="h-4 w-4" /> {showCreate ? "Close" : "Add admin"}
            </Button>
          )}
        </header>

        {!canView ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Shield className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium">Only a Super Admin manages the admin team</p>
          </div>
        ) : (
          <>
            {handoff && <CredentialHandoff handoff={handoff} onDone={() => setHandoff(null)} />}

            {showCreate && canCreate && (
              <CreateAdminPanel
                onCreate={async (payload) => {
                  const created = await createAdmin(payload);
                  setShowCreate(false);
                  if (created.temporaryPassword) {
                    setHandoff({
                      email: created.email,
                      password: created.temporaryPassword,
                      context: `${created.displayName}'s ${ADMIN_TIER_LABELS[created.adminRole]} account was created.`,
                    });
                    notifySuccess("Admin added", "Pass on the sign-in details shown at the top of the page.");
                  } else {
                    notifySuccess("Admin added", `Sign-in details were emailed to ${created.email}.`);
                  }
                }}
                onError={(message) => notifyError("Could not add admin", message)}
              />
            )}

            <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
              {admins.map((member) => {
                const isSelf = member.id === user?.id;
                const active = member.status === "active";
                const busy = busyId?.startsWith(member.id) ?? false;
                const signedIn = ago(member.lastLogin);

                return (
                  <li key={member.id} className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            {member.displayName}
                            {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              member.adminRole === "super_admin"
                                ? "bg-accent/15 text-accent"
                                : member.adminRole === "admin"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-muted text-muted-foreground",
                            )}
                          >
                            {ADMIN_TIER_LABELS[member.adminRole]}
                          </span>
                          {!active && (
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                              Deactivated
                            </span>
                          )}
                          {member.twoFactorEnabled && (
                            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                              2FA on
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {/* Sign-ins weren't recorded until recently, so an empty value
                              means "not since then" — never "never". */}
                          {signedIn ? `Signed in ${signedIn}` : "No sign-in recorded yet"}
                        </p>
                      </div>

                      {isSelf ? (
                        <p className="max-w-56 text-xs text-muted-foreground">
                          You can&apos;t change your own rank or deactivate yourself.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {canEdit && (
                            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmation({ kind: "rank", member, tier: member.adminRole })}>
                              <ShieldCheck className="h-4 w-4" /> Change rank
                            </Button>
                          )}
                          {canEdit && (
                            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmation({ kind: "resend", member })}>
                              <Mail className="h-4 w-4" /> New sign-in details
                            </Button>
                          )}
                          {canManagePermissions && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              aria-expanded={permissionsFor === member.id}
                              onClick={() => setPermissionsFor(permissionsFor === member.id ? null : member.id)}
                            >
                              <KeyRound className="h-4 w-4" /> Permissions
                            </Button>
                          )}
                          <Link href={`/admin/activity-logs?actor=${encodeURIComponent(member.email)}`}>
                            <Button variant="ghost" size="sm">
                              <ScrollText className="h-4 w-4" /> Activity
                            </Button>
                          </Link>
                          {canEdit &&
                            (active ? (
                              <Button variant="ghost" size="sm" disabled={busy} onClick={() => setConfirmation({ kind: "deactivate", member })}>
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                loading={busyId === `${member.id}:reactivate`}
                                loadingText="Reactivating…"
                                onClick={() =>
                                  void run(
                                    `${member.id}:reactivate`,
                                    async () => {
                                      await updateAdmin(member.id, { status: "active" });
                                      notifySuccess(`${member.displayName} reactivated`);
                                    },
                                    "Could not reactivate",
                                  )
                                }
                              >
                                Reactivate
                              </Button>
                            ))}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={busy}
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => setConfirmation({ kind: "remove", member })}
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {!isSelf && canManagePermissions && permissionsFor === member.id && (
                      <div className="mt-4 rounded-xl border border-border bg-background p-4">
                        <p className="text-sm font-medium">Adjust access beyond {ADMIN_TIER_LABELS[member.adminRole]}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Changes apply immediately. &quot;Tier default&quot; marks what the rank includes on its own.
                        </p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {OVERRIDABLE.map(({ action, label }) => {
                            const enabled = (member.permissions ?? []).includes(action);
                            return (
                              <label
                                key={action}
                                className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={enabled}
                                  disabled={busy}
                                  onChange={(event) => togglePermission(member, action, event.target.checked)}
                                  className="h-4 w-4 rounded border-border"
                                />
                                <span className="flex-1">{label}</span>
                                {tierIncludes(member.adminRole, action) && (
                                  <span className="text-[10px] text-muted-foreground">Tier default</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {confirmation && (
        <ConfirmDialog
          confirmation={confirmation}
          busy={busyId === `${confirmation.member.id}:${confirmation.kind}`}
          onChangeTier={(tier) =>
            setConfirmation((current) => (current?.kind === "rank" ? { ...current, tier } : current))
          }
          onCancel={() => setConfirmation(null)}
          onConfirm={() => void confirm()}
        />
      )}
    </AppShell>
  );
}

function CreateAdminPanel({
  onCreate,
  onError,
}: {
  onCreate: (payload: { displayName: string; email: string; adminRole: AdminTierCode; password?: string }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<AdminTierCode>("moderator");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const mismatch = Boolean(password) && password !== confirmPassword;
  const ready = displayName.trim() && email.trim() && !mismatch;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    try {
      await onCreate({ displayName: displayName.trim(), email: email.trim(), adminRole: tier, password: password.trim() || undefined });
    } catch (createError) {
      onError(createError instanceof Error ? createError.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-semibold">Add an admin</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Start with the lowest rank that does the job — it&apos;s one click to raise later.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="new-admin-name" label="Name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
          <Input id="new-admin-email" label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </div>
        <TierPicker value={tier} onChange={setTier} name="new-admin-tier" />
        <details className="rounded-xl border border-border px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium">Set the temporary password yourself</summary>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <PasswordInput id="new-admin-password" label="Temporary password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <PasswordInput id="new-admin-password-confirm" label="Confirm" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </div>
          {mismatch && <p className="mt-2 text-xs text-destructive">The passwords don&apos;t match.</p>}
        </details>
        <Button type="submit" variant="accent" disabled={!ready} loading={submitting} loadingText="Adding…">
          <UserPlus className="h-4 w-4" /> Add {ADMIN_TIER_LABELS[tier]}
        </Button>
      </form>
    </section>
  );
}

function TierPicker({ value, onChange, name }: { value: AdminTierCode; onChange: (tier: AdminTierCode) => void; name: string }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1.5 text-sm font-medium">Rank</legend>
      {TIERS.map((tier) => (
        <label
          key={tier}
          className={cn(
            "flex cursor-pointer gap-3 rounded-xl border px-4 py-3 transition-colors",
            value === tier ? "border-accent bg-accent/5" : "border-border hover:border-accent/40",
          )}
        >
          <input type="radio" name={name} value={tier} checked={value === tier} onChange={() => onChange(tier)} className="mt-1" />
          <span>
            <span className="block text-sm font-medium">{ADMIN_TIER_LABELS[tier]}</span>
            <span className="block text-xs text-muted-foreground">{ADMIN_TIER_DESCRIPTIONS[tier]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function ConfirmDialog({
  confirmation,
  busy,
  onChangeTier,
  onCancel,
  onConfirm,
}: {
  confirmation: Confirmation;
  busy: boolean;
  onChangeTier: (tier: AdminTierCode) => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { member } = confirmation;
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  let title = "";
  let body: string[] = [];
  let action = "";
  let destructive = false;
  let blocked = false;

  if (confirmation.kind === "rank") {
    const unchanged = confirmation.tier === member.adminRole;
    title = `Change ${member.displayName}'s rank`;
    body =
      confirmation.tier === "super_admin" && !unchanged
        ? ["A Super Admin can do everything you can — manage this team, change settings, issue refunds and delete accounts."]
        : [];
    action = unchanged ? "No change" : `Make ${ADMIN_TIER_LABELS[confirmation.tier]}`;
    blocked = unchanged;
  } else if (confirmation.kind === "deactivate") {
    title = `Deactivate ${member.displayName}?`;
    body = ["They're signed out everywhere and can't sign in until reactivated. Their past actions stay in the audit trail."];
    action = "Deactivate";
  } else if (confirmation.kind === "resend") {
    title = `New sign-in details for ${member.displayName}?`;
    body = ["This sets a new temporary password. Their current password stops working immediately."];
    action = "Set new password";
  } else {
    title = `Delete ${member.displayName}?`;
    body = ["This permanently deletes the account. It can't be undone. Their past actions stay in the audit trail."];
    action = "Delete admin";
    destructive = true;
    blocked = typed.trim() !== member.displayName;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !busy && onCancel()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="admin-confirm-title" className="font-display text-lg font-bold">
          {title}
        </h2>
        {confirmation.kind === "rank" && (
          <div className="mt-4">
            <TierPicker value={confirmation.tier} onChange={onChangeTier} name="change-tier" />
          </div>
        )}
        {body.map((line) => (
          <p key={line} className="mt-3 text-sm text-muted-foreground">
            {line}
          </p>
        ))}
        {confirmation.kind === "remove" && (
          <div className="mt-4">
            <label htmlFor="admin-confirm-name" className="text-sm font-medium">
              Type <span className="font-semibold">{member.displayName}</span> to confirm
            </label>
            <input
              id="admin-confirm-name"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoFocus
              className="mt-1.5 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm"
            />
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="accent"
            className={destructive ? "bg-destructive text-white hover:bg-destructive/90" : undefined}
            disabled={blocked}
            loading={busy}
            loadingText="Working…"
            onClick={onConfirm}
          >
            {action}
          </Button>
        </div>
      </div>
    </div>
  );
}
