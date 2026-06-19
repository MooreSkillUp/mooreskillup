"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Copy, KeyRound, Mail, ScrollText, Shield, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { PasswordInput } from "@/components/ui-kit/PasswordInput";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import {
  ADMIN_TIER_DESCRIPTIONS,
  ADMIN_TIER_LABELS,
  useAdminTeam,
  type AdminTeamMember,
  type AdminTierCode,
} from "@/lib/admin-team";
import { rolePermissionMap, type AdminRole } from "@/lib/admin-rbac";
import { publicEnv } from "@/lib/public-env";

const CREATABLE_TIERS: AdminTierCode[] = ["admin", "moderator", "super_admin"];

/** Curated, high-impact permissions a Super Admin can grant or revoke per admin. */
const OVERRIDABLE_PERMISSIONS: { action: string; label: string }[] = [
  { action: "payments:refund", label: "Issue refunds" },
  { action: "courses:delete", label: "Approve course deletions" },
  { action: "teachers:delete", label: "Delete teachers" },
  { action: "students:delete", label: "Delete students" },
  { action: "categories:delete", label: "Delete categories" },
  { action: "admin-settings:edit", label: "Edit platform settings" },
  { action: "audit-logs:view", label: "View audit logs" },
  { action: "activity-logs:export", label: "Export activity logs" },
];

function tierBasePermissions(tier: AdminTierCode): Set<string> {
  const kebab = (tier === "super_admin" ? "super-admin" : tier) as AdminRole;
  return new Set<string>(rolePermissionMap[kebab] ?? []);
}

function tierBadgeClass(tier: AdminTierCode) {
  if (tier === "super_admin")
    return "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-500/15 dark:text-amber-200 dark:border-amber-500/40";
  if (tier === "admin")
    return "bg-blue-100 text-blue-900 border-blue-400 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/40";
  return "bg-slate-200 text-slate-800 border-slate-400 dark:bg-slate-500/15 dark:text-slate-200 dark:border-slate-500/40";
}

function formatLastLogin(value?: string | null) {
  if (!value) return "Never signed in";
  return `Last login ${new Date(value).toLocaleString("en-NG")}`;
}

export default function AdminTeamPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const { admins, isLoading, error, createAdmin, updateAdmin, deleteAdmin, resendCredentials, updatePermissions } =
    useAdminTeam();
  const canManagePermissions = !user?.permissions?.length || user.permissions.includes("permissions:manage");

  const [form, setForm] = useState({ displayName: "", email: "", password: "", confirmPassword: "" });
  const [selectedTier, setSelectedTier] = useState<AdminTierCode>("admin");
  const [submitting, setSubmitting] = useState(false);
  const [busyAdminId, setBusyAdminId] = useState<string | null>(null);
  const [createdAdmin, setCreatedAdmin] = useState<AdminTeamMember | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminTeamMember | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [permissionsOpenId, setPermissionsOpenId] = useState<string | null>(null);

  const canManageAdmins = !user?.permissions?.length || user.permissions.includes("admins:view");

  const togglePermission = async (member: AdminTeamMember, action: string, enable: boolean) => {
    const base = tierBasePermissions(member.adminRole);
    const effective = new Set(member.permissions ?? []);
    if (enable) effective.add(action);
    else effective.delete(action);
    // Re-derive grant/revoke from the curated set only, leaving everything else untouched.
    const grant = new Set(member.permissionOverrides?.grant ?? []);
    const revoke = new Set(member.permissionOverrides?.revoke ?? []);
    OVERRIDABLE_PERMISSIONS.forEach(({ action: perm }) => {
      const want = effective.has(perm);
      const inBase = base.has(perm);
      grant.delete(perm);
      revoke.delete(perm);
      if (want && !inBase) grant.add(perm);
      if (!want && inBase) revoke.add(perm);
    });
    try {
      setBusyAdminId(member.id);
      await updatePermissions(member.id, { grant: [...grant], revoke: [...revoke] });
      notifySuccess("Permissions updated", `${member.displayName}'s access was changed.`);
    } catch (actionError) {
      notifyError(
        "Unable to update permissions",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setBusyAdminId(null);
    }
  };
  const loginUrl = `${publicEnv.appUrl.replace(/\/$/, "")}/login`;

  const copyCredentials = async () => {
    if (!createdAdmin) return;
    const lines = [
      `Name: ${createdAdmin.displayName}`,
      `Email: ${createdAdmin.email}`,
      `Role: ${ADMIN_TIER_LABELS[createdAdmin.adminRole]}`,
      createdAdmin.temporaryPassword ? `Temporary Password: ${createdAdmin.temporaryPassword}` : null,
      `Login URL: ${loginUrl}`,
      "Next Step: Log in and change the password immediately.",
    ].filter(Boolean);
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus("Admin credentials copied.");
    } catch {
      setCopyStatus("Unable to copy automatically. Please copy the credentials manually.");
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setCopyStatus("");

    if (form.password && form.password !== form.confirmPassword) {
      const message = "The password and confirm password fields must match.";
      notifyError("Password mismatch", message);
      return;
    }

    try {
      setSubmitting(true);
      const created = await createAdmin({
        displayName: form.displayName.trim(),
        email: form.email.trim(),
        adminRole: selectedTier,
        password: form.password.trim() || undefined,
      });
      setCreatedAdmin(created);
      setForm({ displayName: "", email: "", password: "", confirmPassword: "" });
      notifySuccess(`${ADMIN_TIER_LABELS[created.adminRole]} account created`);
    } catch (actionError) {
      const message =
        actionError instanceof Error ? actionError.message : "Unable to create admin account.";
      notifyError("Unable to create admin account", message);
    } finally {
      setSubmitting(false);
    }
  };

  const changeRole = async (member: AdminTeamMember, nextTier: AdminTierCode) => {
    if (nextTier === member.adminRole) return;
    try {
      setBusyAdminId(member.id);
      await updateAdmin(member.id, { adminRole: nextTier });
      notifySuccess(`${member.displayName} is now ${ADMIN_TIER_LABELS[nextTier]}`);
    } catch (actionError) {
      notifyError(
        "Unable to change role",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setBusyAdminId(null);
    }
  };

  const toggleStatus = async (member: AdminTeamMember) => {
    const nextStatus = member.status === "active" ? "disabled" : "active";
    try {
      setBusyAdminId(member.id);
      await updateAdmin(member.id, { status: nextStatus });
      notifySuccess(
        nextStatus === "disabled"
          ? `${member.displayName} has been deactivated`
          : `${member.displayName} has been reactivated`,
      );
    } catch (actionError) {
      notifyError(
        "Unable to update status",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setBusyAdminId(null);
    }
  };

  const resend = async (member: AdminTeamMember) => {
    try {
      setBusyAdminId(member.id);
      const result = await resendCredentials(member.id);
      notifySuccess("Sign-in details sent", result.detail);
    } catch (actionError) {
      notifyError(
        "Unable to resend credentials",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setBusyAdminId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteConfirm.trim() !== deleteTarget.displayName) {
      notifyError("Name does not match", "Type the admin's exact name to confirm removal.");
      return;
    }
    try {
      setDeleting(true);
      await deleteAdmin(deleteTarget.id);
      notifySuccess(`${deleteTarget.displayName} removed`, "Their past work and audit trail are kept.");
      setDeleteTarget(null);
      setDeleteConfirm("");
    } catch (actionError) {
      notifyError(
        "Unable to remove admin",
        actionError instanceof Error ? actionError.message : "Request failed.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
              Admin team
            </div>
            <h1 className="mt-2 font-display text-4xl font-bold">Manage your admin team</h1>
            <p className="mt-2 max-w-3xl text-muted-foreground">
              Only the Super Admin can create admins, change their ranks, or deactivate them. Each new
              admin receives a temporary password and must change it on first login.
            </p>
            {error && (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="rounded-3xl border border-border bg-card px-5 py-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Team members</div>
            <div className="mt-2 font-display text-3xl font-bold">{admins.length}</div>
          </div>
        </div>

        {!canManageAdmins ? (
          <div className="rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
            <Shield className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-display text-2xl font-bold">Super Admin access required</h2>
            <p className="mt-2 text-muted-foreground">
              Managing the admin team is reserved for the Super Admin.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                <h2 className="font-display text-2xl font-bold">New admin account</h2>
              </div>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Display name"
                    value={form.displayName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, displayName: event.target.value }))
                    }
                    placeholder="Chinedu Okafor"
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="admin@moreskillup.com"
                    required
                  />
                </div>

                <div className="rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-medium text-foreground">Rank</div>
                  <div className="mt-3 grid gap-3">
                    {CREATABLE_TIERS.map((tier) => {
                      const active = tier === selectedTier;
                      return (
                        <button
                          key={tier}
                          type="button"
                          onClick={() => setSelectedTier(tier)}
                          className={`rounded-2xl border px-4 py-4 text-left transition ${
                            active
                              ? "border-accent bg-accent/10 shadow-sm"
                              : "border-border bg-card hover:border-primary/30"
                          }`}
                        >
                          <div className="font-display text-lg font-bold">{ADMIN_TIER_LABELS[tier]}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {ADMIN_TIER_DESCRIPTIONS[tier]}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <PasswordInput
                    label="Temporary password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Leave blank to auto-generate"
                  />
                  <PasswordInput
                    label="Confirm password"
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, confirmPassword: event.target.value }))
                    }
                    placeholder="Only if you set one"
                  />
                </div>

                <Button
                  type="submit"
                  variant="accent"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || !form.displayName.trim() || !form.email.trim()}
                  loading={submitting}
                  loadingText="Creating admin..."
                >
                  <ShieldCheck className="h-4 w-4" />
                  Create {ADMIN_TIER_LABELS[selectedTier]} account
                </Button>
              </form>

              {createdAdmin && (
                <div className="mt-5 space-y-4 rounded-3xl border border-border bg-background p-5">
                  <div className="text-sm font-medium">
                    {createdAdmin.displayName} · {ADMIN_TIER_LABELS[createdAdmin.adminRole]}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</div>
                    <div className="mt-1 font-medium">{createdAdmin.email}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Temporary password
                    </div>
                    <div className="mt-1 font-medium">
                      {createdAdmin.temporaryPassword ?? "A custom password was set during creation."}
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => void copyCredentials()}>
                    <Copy className="h-4 w-4" />
                    Copy admin credentials
                  </Button>
                  {copyStatus && <p className="text-sm text-success">{copyStatus}</p>}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display text-2xl font-bold">Current team</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                You cannot change your own rank or deactivate yourself, and the platform always keeps at
                least one active Super Admin.
              </p>

              <div className="mt-5 space-y-3">
                {isLoading && (
                  <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    Loading admin team...
                  </div>
                )}
                {!isLoading && !admins.length && (
                  <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                    No admin accounts found.
                  </div>
                )}
                {admins.map((member) => {
                  const isSelf = member.id === user?.id;
                  const busy = busyAdminId === member.id;
                  return (
                    <div key={member.id} className="rounded-3xl border border-border bg-background p-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <div className="font-display text-lg font-bold">
                            {member.displayName}
                            {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
                          </div>
                          <div className="text-sm text-muted-foreground">{member.email}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {formatLastLogin(member.lastLogin)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${tierBadgeClass(member.adminRole)}`}
                          >
                            {ADMIN_TIER_LABELS[member.adminRole]}
                          </span>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              member.status === "active"
                                ? "bg-success/10 text-success"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {member.status === "active" ? "Active" : "Disabled"}
                          </span>
                          {member.twoFactorEnabled && (
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                              2FA on
                            </span>
                          )}
                        </div>
                      </div>

                      {!isSelf && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                            Rank
                          </label>
                          <select
                            value={member.adminRole}
                            disabled={busy}
                            onChange={(event) =>
                              void changeRole(member, event.target.value as AdminTierCode)
                            }
                            className="rounded-xl border border-border bg-card px-3 py-2 text-sm"
                          >
                            {CREATABLE_TIERS.map((tier) => (
                              <option key={tier} value={tier}>
                                {ADMIN_TIER_LABELS[tier]}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant={member.status === "active" ? "outline" : "accent"}
                            size="sm"
                            disabled={busy}
                            onClick={() => void toggleStatus(member)}
                          >
                            {member.status === "active" ? "Deactivate" : "Reactivate"}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            onClick={() => void resend(member)}
                          >
                            <Mail className="h-4 w-4" /> Resend login
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            className="border-destructive/40 text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setDeleteTarget(member);
                              setDeleteConfirm("");
                            }}
                          >
                            <Trash2 className="h-4 w-4" /> Remove
                          </Button>
                          <Link href={`/admin/activity-logs?actor=${encodeURIComponent(member.email)}`}>
                            <Button variant="outline" size="sm">
                              <ScrollText className="h-4 w-4" /> Activity
                            </Button>
                          </Link>
                          {canManagePermissions && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setPermissionsOpenId((current) => (current === member.id ? null : member.id))
                              }
                            >
                              <KeyRound className="h-4 w-4" />
                              {permissionsOpenId === member.id ? "Hide permissions" : "Permissions"}
                            </Button>
                          )}
                        </div>
                      )}

                      {!isSelf && canManagePermissions && permissionsOpenId === member.id && (
                        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                            Permission overrides
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Grant or revoke high-impact actions for this admin on top of their {ADMIN_TIER_LABELS[member.adminRole]} tier.
                          </p>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            {OVERRIDABLE_PERMISSIONS.map(({ action, label }) => {
                              const enabled = (member.permissions ?? []).includes(action);
                              const inBase = tierBasePermissions(member.adminRole).has(action);
                              return (
                                <label
                                  key={action}
                                  className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    disabled={busy}
                                    onChange={(event) => void togglePermission(member, action, event.target.checked)}
                                    className="h-4 w-4 rounded border-border"
                                  />
                                  <span className="flex-1">{label}</span>
                                  {inBase && (
                                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">tier</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <h3 className="font-display text-xl font-bold">Remove {deleteTarget.displayName}?</h3>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              This removes their access to MooreSkillUp immediately. Their past work and the audit trail
              are kept. To confirm, type their full name{" "}
              <span className="font-semibold text-foreground">{deleteTarget.displayName}</span> below.
            </p>
            <Input
              className="mt-4"
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              placeholder={deleteTarget.displayName}
              autoFocus
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteConfirm("");
                }}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="accent"
                className="bg-destructive text-white hover:bg-destructive/90"
                disabled={deleteConfirm.trim() !== deleteTarget.displayName}
                loading={deleting}
                loadingText="Removing..."
                onClick={() => void confirmDelete()}
              >
                Remove admin
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
