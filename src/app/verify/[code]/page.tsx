import type { Metadata } from "next";

import { CertificateVerifyView } from "./CertificateVerifyView";
import { fetchCertificateForPreview } from "./preview-data";

/**
 * A server shell around the verification page, so a certificate link is worth
 * sharing.
 *
 * This is the one link a graduate posts on LinkedIn, and it was rendering as
 * the same grey card as everything else. A certificate nobody can see is a
 * certificate nobody shares, and a certificate nobody shares does no marketing.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const certificate = await fetchCertificateForPreview(code);

  if (!certificate?.valid) {
    // A code that checks out to nothing still gets an honest card: it says what
    // the page is for, and claims nothing about a certificate that isn't there.
    const unknown = "Check whether a MooreSkillUp certificate is genuine.";
    return {
      title: "Verify a certificate",
      description: unknown,
      openGraph: {
        title: "Verify a certificate | MooreSkillUp",
        description: unknown,
        url: `/verify/${code}`,
      },
    };
  }

  const title = `${certificate.studentName} — ${certificate.courseTitle}`;
  const description = `Verified MooreSkillUp certificate. Issued by ${certificate.institution}. Anyone can check it with the code ${code}.`;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title: `${title} | MooreSkillUp`,
      description,
      url: `/verify/${code}`,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function VerifyCertificatePage() {
  return <CertificateVerifyView />;
}
