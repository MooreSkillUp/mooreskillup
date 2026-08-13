"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import {
  Award,
  Download,
  ExternalLink,
  GraduationCap,
  Lock,
  ShieldCheck,
} from "lucide-react";

import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { useAuth } from "@/lib/auth";
import { generateCertificatePdf } from "@/lib/certificate";
import { useFeedback } from "@/lib/feedback";
import { useMyCertificates, useMyCourses } from "@/lib/student";
import { cn } from "@/lib/utils";

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-NG", { day: "numeric", month: "long", year: "numeric" }) : "—";

export default function CertificatesPage() {
  const { user, updateUser } = useAuth();
  const { notifyError, notifySuccess } = useFeedback();
  const isStudent = user?.role === "student";

  const { certificates, template, isLoading } = useMyCertificates(isStudent);
  const { enrollments, isLoading: coursesLoading } = useMyCourses(isStudent);

  const [downloading, setDownloading] = useState<string | null>(null);

  const earned = certificates.filter((cert) => !cert.isRevoked);

  /**
   * Certificate-enabled courses still in progress.
   *
   * Shown locked, with the student's own name on them. Seeing the exact
   * credential you are working toward is a far stronger pull than a padlock
   * icon or an empty page — and none of it is invented: these are real courses
   * they are really enrolled in, with real remaining progress.
   */
  const inProgress = useMemo(() => {
    const earnedCourseIds = new Set(earned.map((cert) => cert.courseId));
    return enrollments
      .filter(
        (enrollment) =>
          enrollment.course.certificateEnabled &&
          enrollment.status !== "revoked" &&
          !earnedCourseIds.has(enrollment.course.id),
      )
      .sort((a, b) => b.progressPercent - a.progressPercent);
  }, [earned, enrollments]);

  const download = async (cert: (typeof certificates)[number]) => {
    setDownloading(cert.id);
    try {
      await generateCertificatePdf({
        // The real name — never the username. See User.full_name.
        recipientName: cert.recipientName || user?.fullName || "Learner",
        courseTitle: cert.courseTitle,
        trackLabel: [cert.categoryName, cert.trackName].filter(Boolean).join(" · "),
        date: formatDate(cert.issuedAt),
        certId: cert.certificateCode,
        verificationUrl: cert.verificationUrl,
        institution: template?.institutionName,
        signatoryName: template?.signatoryName,
        signatoryTitle: template?.signatoryTitle,
        accentColor: template?.accentColor,
        sealText: template?.sealText,
      });
    } catch {
      notifyError("Could not build your certificate", "Please try again in a moment.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Certificates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete a certificate-enabled course to earn one. Each carries a unique ID and a public
            verification link anyone can check.
          </p>
        </div>

        {/* Accounts created before real names were collected would otherwise
            print a username on something meant to be shown to an employer. */}
        {isStudent && user && !user.hasRealName && (
          <NamePrompt
            onSave={async (firstName, lastName) => {
              await updateUser({ firstName, lastName });
              notifySuccess("Name saved", "Your certificates will use it from now on.");
            }}
          />
        )}

        {isLoading || coursesLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[0, 1].map((row) => (
              <div key={row} className="h-56 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : !earned.length && !inProgress.length ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-14 text-center">
            <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <p className="mt-3 font-medium">No certificates yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Enrol in a course that awards one and you&apos;ll see it here, locked, until you finish.
            </p>
            <Link href="/dashboard/courses" className="mt-5 inline-block">
              <Button variant="accent">Browse courses</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {earned.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Earned · {earned.length}
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  {earned.map((cert) => (
                    <CertificateCard
                      key={cert.id}
                      title={cert.courseTitle}
                      track={[cert.categoryName, cert.trackName].filter(Boolean).join(" · ")}
                      recipient={cert.recipientName || user?.fullName || ""}
                      meta={[
                        { label: "Certificate ID", value: cert.certificateCode, mono: true },
                        { label: "Issued", value: formatDate(cert.issuedAt) },
                      ]}
                      actions={
                        <>
                          <Button
                            variant="accent"
                            size="sm"
                            loading={downloading === cert.id}
                            loadingText="Building..."
                            onClick={() => void download(cert)}
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                          {cert.verificationUrl && (
                            <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm">
                                <ShieldCheck className="h-4 w-4" />
                                Verify
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </a>
                          )}
                        </>
                      }
                    />
                  ))}
                </div>
              </section>
            )}

            {inProgress.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                  In progress · {inProgress.length}
                </h2>
                <div className="grid gap-5 sm:grid-cols-2">
                  {inProgress.map((enrollment) => (
                    <CertificateCard
                      key={enrollment.enrollmentId}
                      locked
                      title={enrollment.course.title}
                      track={enrollment.course.program}
                      recipient={user?.fullName || ""}
                      progressPercent={enrollment.progressPercent}
                      actions={
                        <Link href={`/course/${enrollment.course.id}`}>
                          <Button variant="outline" size="sm">
                            Continue course
                          </Button>
                        </Link>
                      }
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */

function CertificateCard({
  title,
  track,
  recipient,
  meta,
  actions,
  locked = false,
  progressPercent,
}: {
  title: string;
  track?: string;
  recipient: string;
  meta?: { label: string; value: string; mono?: boolean }[];
  actions: React.ReactNode;
  locked?: boolean;
  progressPercent?: number;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* A miniature of the real certificate. Blurred while locked, so what is
          being worked toward is recognisable without being usable. */}
      <div className="relative">
        <div
          className={cn(
            "flex aspect-[1.414/1] flex-col items-center justify-center border-b border-border bg-[#fdfcfa] px-6 text-center",
            locked && "blur-[3px] select-none",
          )}
          aria-hidden={locked}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            MooreSkillUp
          </span>
          <span className="mt-2 font-display text-lg text-[#0f203c]">Certificate of Completion</span>
          <span className="mt-1 h-0.5 w-8 rounded-full bg-accent" />

          <span className="mt-4 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            This certifies that
          </span>
          <span className="mt-1 font-display text-xl font-bold text-[#1a1e26]">
            {recipient || "Your name"}
          </span>
          <span className="mt-0.5 h-px w-32 bg-accent/60" />

          <span className="mt-3 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            has completed
          </span>
          <span className="mt-1 line-clamp-2 text-sm font-semibold text-[#0f203c]">{title}</span>
          {track && <span className="mt-0.5 text-[10px] text-muted-foreground">{track}</span>}
        </div>

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/50">
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-sm">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </span>
            <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold shadow-sm">
              {typeof progressPercent === "number"
                ? `${Math.round(progressPercent)}% complete`
                : "Locked"}
            </span>
          </div>
        )}

        {!locked && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success">
            <Award className="h-3.5 w-3.5" />
            Earned
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <p className="truncate font-medium">{title}</p>
          {track && <p className="truncate text-xs text-muted-foreground">{track}</p>}
        </div>

        {meta?.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{row.label}</span>
            <span className={cn("truncate font-medium", row.mono && "font-mono text-xs")}>
              {row.value}
            </span>
          </div>
        ))}

        {locked && typeof progressPercent === "number" && (
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">{actions}</div>
      </div>
    </div>
  );
}

/** Asked once, for accounts that predate real names being collected. */
function NamePrompt({
  onSave,
}: {
  onSave: (firstName: string, lastName: string) => Promise<void>;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(firstName.trim(), lastName.trim());
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
      <h2 className="font-display text-base font-semibold">Add your name for your certificates</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Certificates print your full name, not your username. Enter it exactly as you want it to
        appear — you can change it later in Settings.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input
          label="First name"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          autoComplete="given-name"
          required
        />
        <Input
          label="Last name"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          autoComplete="family-name"
          required
        />
      </div>

      <Button
        type="submit"
        variant="accent"
        className="mt-4"
        loading={saving}
        loadingText="Saving..."
        disabled={!firstName.trim() || !lastName.trim()}
      >
        Save name
      </Button>
    </form>
  );
}
