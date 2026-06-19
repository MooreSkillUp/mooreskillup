"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, Search, ShieldX } from "lucide-react";
import { BrandLogo } from "@/components/shared/BrandLogo";
import { Button } from "@/components/ui-kit/Button";
import { Input } from "@/components/ui-kit/Input";
import { verifyCertificate, type CertificateVerifyResult } from "@/lib/certificates-admin";

export default function VerifyLandingPage() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<CertificateVerifyResult | null>(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const id = code.trim();
    if (!id) return;
    setLoading(true);
    try {
      const data = await verifyCertificate(id);
      setResult(data);
    } catch {
      setResult({ valid: false });
    } finally {
      setChecked(true);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <BrandLogo href="/" />
      <div className="mt-8 w-full max-w-lg rounded-[2rem] border border-border bg-card p-8 shadow-sm">
        <div className="text-center">
          <div className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Certificate verification
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold">Verify a certificate</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the certificate ID (e.g. <span className="font-mono">MSU-AB12CD34</span>) to confirm it&apos;s authentic.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input
            label="Certificate ID"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              setChecked(false);
            }}
            placeholder="MSU-XXXXXXXX"
            autoFocus
          />
          <Button type="submit" variant="accent" className="w-full" disabled={!code.trim()} loading={loading} loadingText="Verifying...">
            <Search className="h-4 w-4" /> Verify certificate
          </Button>
        </form>

        {checked && result?.valid && (
          <div className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-5 text-center">
            <BadgeCheck className="mx-auto h-12 w-12 text-success" />
            <h2 className="mt-3 font-display text-2xl font-bold">Valid certificate</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Issued by {result.institution ?? "MooreSkillUp"} and authentic.
            </p>
            <dl className="mt-4 space-y-2 text-left">
              <Row label="Certificate ID" value={result.certificateCode ?? code} />
              <Row label="Issued to" value={result.studentName ?? "—"} />
              <Row label="Course" value={result.courseTitle ?? "—"} />
              <Row
                label="Issued on"
                value={result.issuedAt ? new Date(result.issuedAt).toLocaleDateString("en-NG") : "—"}
              />
            </dl>
          </div>
        )}

        {checked && !result?.valid && (
          <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-center">
            <ShieldX className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-3 font-display text-2xl font-bold">Not verified</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No valid certificate found for <span className="font-mono">{code.trim()}</span>. It may be mistyped or revoked.
            </p>
          </div>
        )}

        <Link href="/" className="mt-8 block text-center text-sm font-semibold text-primary">
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
