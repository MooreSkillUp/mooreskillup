import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { BrandLogo } from "@/components/shared/BrandLogo";
import { LegalText } from "@/components/shared/LegalText";
import { serverApiUrl } from "@/lib/server-api";

/**
 * A legal document, readable by anyone.
 *
 * Rendered on the server so it works for a signed-out visitor, prints cleanly,
 * and shows the right title when linked. The text is whatever a Super Admin
 * last published; until then the page says so rather than showing a blank.
 */
const KINDS = ["terms", "privacy", "refund"] as const;
type Kind = (typeof KINDS)[number];

interface LegalDoc {
  kind: Kind;
  title: string;
  body: string;
  version: number;
  publishedAt: string | null;
  isPublished: boolean;
}

async function load(kind: string): Promise<LegalDoc | null> {
  if (!KINDS.includes(kind as Kind)) return null;
  try {
    const response = await fetch(serverApiUrl(`/api/legal/${kind}/`), {
      // Edits should appear within a minute, not a day.
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as LegalDoc;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ kind: string }>;
}): Promise<Metadata> {
  const { kind } = await params;
  const doc = await load(kind);
  return { title: doc?.title ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!KINDS.includes(kind as Kind)) notFound();
  const doc = await load(kind);

  const updated =
    doc?.publishedAt &&
    new Date(doc.publishedAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> MooreSkillUp
      </Link>
      <div className="mt-6">
        <BrandLogo tagline={false} />
      </div>

      <h1 className="mt-8 font-display text-3xl font-bold sm:text-4xl">
        {doc?.title ?? "Legal"}
      </h1>
      {doc?.isPublished && updated && (
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated {updated} · version {doc.version}
        </p>
      )}

      <div className="mt-8">
        {doc?.isPublished ? (
          <LegalText source={doc.body} />
        ) : (
          <p className="rounded-2xl border border-border bg-card p-6 text-muted-foreground">
            This document is being finalised and will be published here shortly.
          </p>
        )}
      </div>

      <nav className="mt-12 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm">
        <Link href="/legal/terms" className="text-muted-foreground hover:text-foreground">
          Terms of Service
        </Link>
        <Link href="/legal/privacy" className="text-muted-foreground hover:text-foreground">
          Privacy Policy
        </Link>
        <Link href="/legal/refund" className="text-muted-foreground hover:text-foreground">
          Refund Policy
        </Link>
      </nav>
    </main>
  );
}
