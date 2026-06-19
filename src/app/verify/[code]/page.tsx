"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, ShieldX } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { verifyCertificate, type CertificateVerifyResult } from "@/lib/certificates-admin";

export default function VerifyCertificatePage() {
  const params = useParams();
  const code = String(params.code ?? "");
  const [result, setResult] = useState<CertificateVerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    verifyCertificate(code)
      .then((data) => active && setResult(data))
      .catch(() => active && setResult({ valid: false }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [code]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <BrandLogo href="/" />
      <div className="mt-8 w-full max-w-lg rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm">
        <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
          Certificate verification
        </div>

        {loading ? (
          <p className="mt-6 text-muted-foreground">Verifying {code}...</p>
        ) : result?.valid ? (
          <>
            <BadgeCheck className="mx-auto mt-6 h-16 w-16 text-success" />
            <h1 className="mt-4 font-display text-3xl font-bold">Valid certificate</h1>
            <p className="mt-2 text-muted-foreground">
              This certificate was issued by {result.institution ?? "MooreSkillUp"} and is authentic.
            </p>
            <dl className="mt-6 space-y-3 text-left">
              <Row label="Certificate ID" value={result.certificateCode ?? code} />
              <Row label="Issued to" value={result.studentName ?? "—"} />
              <Row label="Course" value={result.courseTitle ?? "—"} />
              <Row
                label="Issued on"
                value={result.issuedAt ? new Date(result.issuedAt).toLocaleDateString("en-NG") : "—"}
              />
            </dl>
          </>
        ) : (
          <>
            <ShieldX className="mx-auto mt-6 h-16 w-16 text-destructive" />
            <h1 className="mt-4 font-display text-3xl font-bold">Not verified</h1>
            <p className="mt-2 text-muted-foreground">
              We could not find a valid certificate for{" "}
              <span className="font-mono font-medium">{code}</span>. It may be mistyped or revoked.
            </p>
          </>
        )}

        <Link href="/" className="mt-8 inline-block text-sm font-semibold text-primary">
          Back to MooreSkillUp
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
