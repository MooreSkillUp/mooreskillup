"use client";

import { useEffect, useState } from "react";
import { KeyRound, Settings, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth";
import { hasUserPermission } from "@/lib/admin-rbac";
import { useFeedback } from "@/lib/feedback";
import { useAdminSettings } from "@/lib/platform-admin";

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({
  checked,
  onChange,
  disabled,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-background p-5">
      <div>
        <div className="font-medium">{label}</div>
        <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminSettingsPage() {
  const { user, toggleTwoFactor, logoutAll } = useAuth();
  const router = useRouter();
  const { notifyError, notifySuccess } = useFeedback();
  const { settings, isLoading, error, saveSettings } = useAdminSettings();

  const [form, setForm] = useState({
    siteName: "",
    maintenanceMode: false,
    maintenanceMessage: "",
    studentRegistrationOpen: true,
    auditRetentionDays: 90,
    requireAdminSecondApproval: false,
    allowTeacherAnnouncements: false,
    allowModeratorAnnouncements: false,
    featureReviewsEnabled: true,
    featureCertificatesEnabled: true,
    featureRecommendationsEnabled: true,
    featureAchievementsEnabled: false,
    featureLeaderboardEnabled: false,
    featureQuizEnabled: false,
    refundWindowDays: 14,
    refundMaxProgressPercent: 30,
  });
  const [saving, setSaving] = useState(false);
  const [togglingTwoFactor, setTogglingTwoFactor] = useState(false);
  const [logoutAllBusy, setLogoutAllBusy] = useState(false);

  const canEdit = hasUserPermission(user?.permissions, "admin-settings:edit");
  const canView = hasUserPermission(user?.permissions, "admin-settings:view");
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (settings) {
      setForm({
        siteName: settings.siteName,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        studentRegistrationOpen: settings.studentRegistrationOpen,
        auditRetentionDays: settings.auditRetentionDays,
        requireAdminSecondApproval: settings.requireAdminSecondApproval,
        allowTeacherAnnouncements: settings.allowTeacherAnnouncements,
        allowModeratorAnnouncements: settings.allowModeratorAnnouncements,
        featureReviewsEnabled: settings.featureReviewsEnabled,
        featureCertificatesEnabled: settings.featureCertificatesEnabled,
        featureRecommendationsEnabled: settings.featureRecommendationsEnabled,
        featureAchievementsEnabled: settings.featureAchievementsEnabled,
        featureLeaderboardEnabled: settings.featureLeaderboardEnabled,
        featureQuizEnabled: settings.featureQuizEnabled,
        refundWindowDays: settings.refundWindowDays,
        refundMaxProgressPercent: settings.refundMaxProgressPercent,
      });
    }
  }, [settings]);

  const onSave = async () => {
    try {
      setSaving(true);
      await saveSettings(form);
      notifySuccess("Settings saved");
    } catch (saveError) {
      notifyError(
        "Unable to save settings",
        saveError instanceof Error ? saveError.message : "Request failed.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onToggleTwoFactor = async () => {
    setTogglingTwoFactor(true);
    try {
      const enabled = await toggleTwoFactor(!user?.twoFactorEnabled);
      notifySuccess(
        enabled
          ? "Two-factor authentication enabled. A code will be sent to your email each login."
          : "Two-factor authentication disabled.",
      );
    } catch (err) {
      notifyError(
        "Unable to update 2FA",
        err instanceof Error ? err.message : "Request failed.",
      );
    } finally {
      setTogglingTwoFactor(false);
    }
  };

  const onLogoutAll = async () => {
    setLogoutAllBusy(true);
    try {
      await logoutAll();
      notifySuccess("Signed out everywhere", "You have been logged out of all devices.");
      router.push("/auth/login?signed_out=all");
    } catch (err) {
      notifyError(
        "Could not sign out everywhere",
        err instanceof Error ? err.message : "Request failed.",
      );
    } finally {
      setLogoutAllBusy(false);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">
            Platform settings
          </div>
          <h1 className="mt-2 font-display text-4xl font-bold">System configuration</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            These switches control the live platform. Only the Super Admin can change them; every
            change is recorded in the activity log.
          </p>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>

        {!canView ? (
          <div className="rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 font-display text-2xl font-bold">No access</h2>
            <p className="mt-2 text-muted-foreground">
              Settings are reserved for Admins and the Super Admin.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl space-y-4">
            {!canEdit && (
              <div className="rounded-3xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
                You can view these settings, but only the Super Admin can change them.
              </div>
            )}

            {/* ── Security (per-admin, always visible to admins) ── */}
            {isAdmin && (
              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Your account security
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  These settings apply to your admin account only, not the whole platform.
                </p>

                <div className="mt-5 space-y-4">
                  {/* 2FA toggle */}
                  <div className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-background p-5">
                    <div>
                      <div className="font-medium">Two-factor authentication (email OTP)</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {user?.twoFactorEnabled
                          ? "Active — you'll receive a one-time code by email each time you log in."
                          : "Off — enable this to require an email code every time you sign in."}
                      </div>
                      {user?.twoFactorEnabled && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> Enabled
                        </div>
                      )}
                    </div>
                    <Button
                      variant={user?.twoFactorEnabled ? "outline" : "accent"}
                      loading={togglingTwoFactor}
                      loadingText={user?.twoFactorEnabled ? "Disabling…" : "Enabling…"}
                      onClick={() => void onToggleTwoFactor()}
                    >
                      {user?.twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
                    </Button>
                  </div>

                  {/* Permission overrides shortcut */}
                  <div className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-background p-5">
                    <div>
                      <div className="font-medium">Permission overrides</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Super Admins can grant or revoke individual permissions per admin member,
                        beyond what their role provides by default.
                      </div>
                    </div>
                  <Button
                    variant="outline"
                    onClick={() => router.push("/admin/admins")}
                  >
                    <Users className="h-4 w-4" /> Manage team
                  </Button>
                </div>

                <div className="flex items-start justify-between gap-4 rounded-3xl border border-border bg-background p-5">
                  <div>
                    <div className="font-medium">Sign out of all devices</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      End every active session attached to your admin account.
                    </div>
                  </div>
                  <Button variant="outline" loading={logoutAllBusy} loadingText="Signing out..." onClick={() => void onLogoutAll()}>
                    Sign out everywhere
                  </Button>
                </div>
              </div>
            </div>
            )}

            {/* ── General ── */}
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <Settings className="h-5 w-5 text-primary" />
                General
              </h2>
              <div className="mt-4 space-y-4">
                <Input
                  label="Platform name"
                  value={form.siteName}
                  disabled={!canEdit || isLoading}
                  onChange={(e) => setForm((c) => ({ ...c, siteName: e.target.value }))}
                />
                <Input
                  label="Keep activity logs for (days)"
                  type="number"
                  min={7}
                  max={3650}
                  value={String(form.auditRetentionDays)}
                  disabled={!canEdit || isLoading}
                  onChange={(e) =>
                    setForm((c) => ({
                      ...c,
                      auditRetentionDays: Number(e.target.value) || c.auditRetentionDays,
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Logs older than this are deleted automatically so storage never piles up.
                </p>
              </div>
            </div>

            {/* ── Access control ── */}
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Access control
              </h2>
              <div className="mt-4 space-y-4">
                <Toggle
                  checked={form.studentRegistrationOpen}
                  disabled={!canEdit || isLoading}
                  onChange={(next) => setForm((c) => ({ ...c, studentRegistrationOpen: next }))}
                  label="Student registration open"
                  description="When off, new students cannot create accounts. Existing users are unaffected."
                />
                <Toggle
                  checked={form.maintenanceMode}
                  disabled={!canEdit || isLoading}
                  onChange={(next) => setForm((c) => ({ ...c, maintenanceMode: next }))}
                  label="Maintenance mode"
                  description="When on, only admins can use the platform. Everyone else sees your maintenance message."
                />
                {form.maintenanceMode && (
                  <div>
                    <div className="mb-1 text-sm font-medium">Maintenance message</div>
                    <Textarea
                      value={form.maintenanceMessage}
                      disabled={!canEdit || isLoading}
                      onChange={(e) =>
                        setForm((c) => ({ ...c, maintenanceMessage: e.target.value }))
                      }
                      placeholder="We are performing scheduled maintenance. Please check back soon."
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Course approval & announcements ── */}
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Course approval &amp; announcements
              </h2>
              <div className="mt-4 space-y-4">
                <Toggle
                  checked={form.requireAdminSecondApproval}
                  disabled={!canEdit || isLoading}
                  onChange={(next) => setForm((c) => ({ ...c, requireAdminSecondApproval: next }))}
                  label="Require admin second approval"
                  description="A moderator's approval marks a course 'approved' and waits for an Admin or Super Admin to publish it."
                />
                <Toggle
                  checked={form.allowTeacherAnnouncements}
                  disabled={!canEdit || isLoading}
                  onChange={(next) => setForm((c) => ({ ...c, allowTeacherAnnouncements: next }))}
                  label="Allow teacher announcements"
                  description="Teachers can broadcast announcements to their students. Off means only admins announce."
                />
                <Toggle
                  checked={form.allowModeratorAnnouncements}
                  disabled={!canEdit || isLoading}
                  onChange={(next) =>
                    setForm((c) => ({ ...c, allowModeratorAnnouncements: next }))
                  }
                  label="Allow moderator announcements"
                  description="When on, moderators can send broadcasts."
                />
              </div>
            </div>

            {/* ── Student features ── */}
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Student features
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Turn student-facing features on or off platform-wide. Disabled features show as
                &quot;Coming soon&quot; or hide entirely.
              </p>
              <div className="mt-4 space-y-4">
                <Toggle
                  checked={form.featureReviewsEnabled}
                  disabled={!canEdit || isLoading}
                  onChange={(next) => setForm((c) => ({ ...c, featureReviewsEnabled: next }))}
                  label="Course reviews &amp; ratings"
                  description="Students who finish (or get halfway through) a course can rate and review it."
                />
                <Toggle
                  checked={form.featureCertificatesEnabled}
                  disabled={!canEdit || isLoading}
                  onChange={(next) => setForm((c) => ({ ...c, featureCertificatesEnabled: next }))}
                  label="Certificates"
                  description="Issue certificates when students complete certificate-enabled courses."
                />
                <Toggle
                  checked={form.featureRecommendationsEnabled}
                  disabled={!canEdit || isLoading}
                  onChange={(next) =>
                    setForm((c) => ({ ...c, featureRecommendationsEnabled: next }))
                  }
                  label="Recommendations"
                  description="Show track-based and instructor-recommended courses to students."
                />
                <Toggle
                  checked={form.featureAchievementsEnabled}
                  disabled={!canEdit || isLoading}
                  onChange={(next) =>
                    setForm((c) => ({ ...c, featureAchievementsEnabled: next }))
                  }
                  label="Achievements (coming soon)"
                  description="Badges and milestones. Off = shows as 'Coming soon' to students."
                />
                <Toggle
                  checked={form.featureLeaderboardEnabled}
                  disabled={!canEdit || isLoading}
                  onChange={(next) =>
                    setForm((c) => ({ ...c, featureLeaderboardEnabled: next }))
                  }
                  label="Leaderboard (coming soon)"
                  description="Ranked learner standings. Off = shows as 'Coming soon'."
                />
                <Toggle
                  checked={form.featureQuizEnabled}
                  disabled={!canEdit || isLoading}
                  onChange={(next) => setForm((c) => ({ ...c, featureQuizEnabled: next }))}
                  label="Quiz shop (coming soon)"
                  description="Quizzes and quiz rewards. Off = shows as 'Coming soon'."
                />
              </div>
            </div>

            {/* ── Refund policy ── */}
            <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <ShieldCheck className="h-5 w-5 text-primary" />
                Refund policy
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A payment can only be refunded within this many days of purchase and while the
                student is under the progress cap. Set days to 0 to disable the time limit.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Input
                  label="Refund window (days)"
                  type="number"
                  min={0}
                  max={365}
                  value={String(form.refundWindowDays)}
                  disabled={!canEdit || isLoading}
                  onChange={(e) =>
                    setForm((c) => ({ ...c, refundWindowDays: Number(e.target.value) || 0 }))
                  }
                />
                <Input
                  label="Max progress for refund (%)"
                  type="number"
                  min={0}
                  max={100}
                  value={String(form.refundMaxProgressPercent)}
                  disabled={!canEdit || isLoading}
                  onChange={(e) =>
                    setForm((c) => ({
                      ...c,
                      refundMaxProgressPercent: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            {canEdit && (
              <Button
                variant="accent"
                size="lg"
                onClick={() => void onSave()}
                disabled={isLoading}
                loading={saving}
                loadingText="Saving…"
              >
                Save settings
              </Button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
