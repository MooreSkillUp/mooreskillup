"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, Palette, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";
import { useFeedback } from "@/lib/feedback";
import {
  useAdminCertificates,
  useCertificateTemplate,
  type CertificateTemplate,
} from "@/lib/certificates-admin";

export default function AdminCertificatesPage() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const { template, saveTemplate, isLoading: templateLoading } = useCertificateTemplate();
  const { certificates, isLoading, error, setRevoked } = useAdminCertificates();

  const [form, setForm] = useState<CertificateTemplate>({
    institutionName: "",
    signatoryName: "",
    signatoryTitle: "",
    accentColor: "#4f46e5",
    signatureText: "",
    sealText: "",
  });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const canEditTemplate = user?.permissions?.includes("admin-settings:edit") ?? false;
  const canRevoke = user?.permissions?.includes("permissions:manage") ?? false;

  useEffect(() => {
    if (template) setForm(template);
  }, [template]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return certificates;
    return certificates.filter((cert) =>
      [cert.certificateCode, cert.studentName, cert.courseTitle].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [certificates, search]);

  const onSaveTemplate = async () => {
    try {
      setSaving(true);
      await saveTemplate(form);
      notifySuccess("Certificate template saved");
    } catch (saveError) {
      notifyError("Unable to save", saveError instanceof Error ? saveError.message : "Request failed.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRevoke = async (id: string, revoke: boolean) => {
    try {
      setBusyId(id);
      await setRevoked(id, revoke);
      notifySuccess(revoke ? "Certificate revoked" : "Certificate restored");
    } catch (actionError) {
      notifyError("Action failed", actionError instanceof Error ? actionError.message : "Request failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppShell allowedRoles={["admin"]}>
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Certificates</div>
          <h1 className="mt-2 font-display text-4xl font-bold">Certificate management</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            MooreSkillUp owns all certificates. Set the template once — it styles every certificate
            students receive. Each has a unique ID and a public verification link.
          </p>
          {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          {/* Template */}
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
              <Palette className="h-5 w-5 text-primary" />
              Certificate template
            </h2>
            {!canEditTemplate && (
              <p className="mt-3 rounded-2xl border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
                Only the Super Admin can edit the template.
              </p>
            )}
            <div className="mt-4 space-y-4">
              <Input
                label="Institution name"
                value={form.institutionName}
                disabled={!canEditTemplate || templateLoading}
                onChange={(event) => setForm((current) => ({ ...current, institutionName: event.target.value }))}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Signatory name"
                  value={form.signatoryName}
                  disabled={!canEditTemplate || templateLoading}
                  onChange={(event) => setForm((current) => ({ ...current, signatoryName: event.target.value }))}
                />
                <Input
                  label="Signatory title"
                  value={form.signatoryTitle}
                  disabled={!canEditTemplate || templateLoading}
                  onChange={(event) => setForm((current) => ({ ...current, signatoryTitle: event.target.value }))}
                />
              </div>
              <Input
                label="Signature text (rendered in cursive)"
                value={form.signatureText}
                disabled={!canEditTemplate || templateLoading}
                onChange={(event) => setForm((current) => ({ ...current, signatureText: event.target.value }))}
              />
              <Input
                label="Seal text"
                value={form.sealText}
                disabled={!canEditTemplate || templateLoading}
                onChange={(event) => setForm((current) => ({ ...current, sealText: event.target.value }))}
              />
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-foreground">Accent colour</label>
                <input
                  type="color"
                  value={form.accentColor}
                  disabled={!canEditTemplate || templateLoading}
                  onChange={(event) => setForm((current) => ({ ...current, accentColor: event.target.value }))}
                  className="h-9 w-16 rounded border border-border"
                />
                <span className="text-sm text-muted-foreground">{form.accentColor}</span>
              </div>
            </div>

            {/* Live preview */}
            <div
              className="mt-5 rounded-2xl border-4 p-5 text-center"
              style={{ borderColor: form.accentColor }}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: form.accentColor }}>
                {form.institutionName || "MooreSkillUp"}
              </div>
              <div className="mt-2 font-display text-xl font-bold">Certificate of Completion</div>
              <div className="mt-2 text-sm text-muted-foreground">This certifies that</div>
              <div className="mt-1 font-display text-lg font-bold">Student Name</div>
              <div className="mt-1 text-sm text-muted-foreground">completed the course</div>
              <div className="mt-3 italic" style={{ fontFamily: "cursive" }}>{form.signatureText || "MooreSkillUp"}</div>
              <div className="text-xs text-muted-foreground">
                {form.signatoryName} · {form.signatoryTitle}
              </div>
            </div>

            {canEditTemplate && (
              <Button
                variant="accent"
                className="mt-5"
                onClick={() => void onSaveTemplate()}
                loading={saving}
                loadingText="Saving..."
              >
                <ShieldCheck className="h-4 w-4" />
                Save template
              </Button>
            )}
          </section>

          {/* Issued certificates */}
          <section className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <Award className="h-5 w-5 text-primary" />
                Issued certificates
              </h2>
              <div className="relative w-full max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search ID, student, course"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {isLoading && <div className="text-sm text-muted-foreground">Loading certificates...</div>}
              {!isLoading && !filtered.length && (
                <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
                  No certificates issued yet. They appear automatically when students complete
                  certificate-enabled courses.
                </div>
              )}
              {filtered.map((cert) => (
                <div key={cert.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-mono text-sm font-semibold">{cert.certificateCode}</div>
                      <div className="text-sm text-muted-foreground">
                        {cert.studentName} · {cert.courseTitle}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Issued {new Date(cert.issuedAt).toLocaleDateString("en-NG")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          cert.isRevoked ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                        }`}
                      >
                        {cert.isRevoked ? "Revoked" : "Valid"}
                      </span>
                      {canRevoke && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === cert.id}
                          onClick={() => void toggleRevoke(cert.id, !cert.isRevoked)}
                        >
                          {cert.isRevoked ? "Restore" : "Revoke"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
