"use client";

import Link from "next/link";
import { Award, Download, ExternalLink, GraduationCap, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/dashboard/AppShell";
import { Button } from "@/components/ui-kit/Button";
import { useAuth } from "@/lib/auth";
import { generateCertificatePdf } from "@/lib/certificate";
import { useMyCertificates } from "@/lib/student";

export default function CertificatesPage() {
  const { user } = useAuth();
  const { certificates, template, isLoading } = useMyCertificates(user?.role === "student");

  const active = certificates.filter((c) => !c.isRevoked);

  const download = (cert: (typeof certificates)[number]) => {
    generateCertificatePdf({
      recipientName: user?.displayName ?? "Learner",
      courseTitle: cert.courseTitle,
      date: cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString("en-NG") : "",
      certId: cert.certificateCode,
      institution: template?.institutionName,
      signatoryName: template?.signatoryName,
      signatoryTitle: template?.signatoryTitle,
      accentColor: template?.accentColor,
      sealText: template?.sealText,
      verificationUrl: cert.verificationUrl,
    });
  };

  return (
    <AppShell allowedRoles={["student"]}>
      <div className="space-y-6">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.25em] text-primary">Certificates</div>
          <h1 className="mt-2 font-display text-4xl font-bold">Your achievements</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Earn a MooreSkillUp certificate by completing a certificate-enabled course. Each one has a
            unique ID and a public verification link.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-[2rem] bg-muted/40" />
            ))}
          </div>
        ) : !active.length ? (
          <div className="rounded-[2rem] border border-dashed border-border bg-card p-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
            <h2 className="mt-4 font-display text-2xl font-bold">No certificates yet</h2>
            <p className="mt-2 text-muted-foreground">
              Finish a certificate-enabled course and it will appear here, ready to download.
            </p>
            <Link href="/dashboard/courses" className="mt-4 inline-block">
              <Button variant="accent">Browse courses</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {active.map((cert) => (
              <div key={cert.id} className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
                <div className="bg-gradient-to-br from-primary via-primary-glow to-accent p-6 text-white">
                  <Award className="h-10 w-10" />
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                    Certificate of Completion
                  </div>
                  <div className="mt-1 font-display text-2xl font-bold">{cert.courseTitle}</div>
                </div>
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Certificate ID</span>
                    <span className="font-mono font-semibold">{cert.certificateCode}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Issued</span>
                    <span>{cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString("en-NG") : "—"}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="accent" size="sm" onClick={() => download(cert)}>
                      <Download className="h-4 w-4" /> Download PDF
                    </Button>
                    {cert.verificationUrl && (
                      <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          <ShieldCheck className="h-4 w-4" /> Verify
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
