"use client";

/**
 * Getting a certificate in front of other people.
 *
 * A certificate nobody sees does no work. These build the three things a
 * graduate actually needs: a message worth pasting, a link anyone can check,
 * and the one-click route onto a LinkedIn profile — which is where an employer
 * looks, and the only place a credential earns its keep.
 */
export interface ShareableCertificate {
  courseTitle: string;
  certificateCode: string;
  verificationUrl: string;
  issuedAt: string;
  institution?: string;
}

/** The words people paste. Specific beats clever; no hype, no promises. */
export function certificateMessage(cert: ShareableCertificate): string {
  return `I finished ${cert.courseTitle} on MooreSkillUp and earned a certificate. Anyone can check it here: ${cert.verificationUrl}`;
}

/**
 * LinkedIn's "add to profile" deep link.
 *
 * It drops the credential straight into Licenses & Certifications with the
 * fields already filled, instead of asking somebody to retype five of them —
 * which is where most people give up. LinkedIn wants the month as a number and
 * the year separately; sending an ISO date silently produces a blank date, so
 * the fields are split here rather than hoped for.
 */
export function linkedInAddUrl(
  cert: ShareableCertificate,
  organisation = "MooreSkillUp",
): string {
  const issued = new Date(cert.issuedAt);
  const valid = !Number.isNaN(issued.getTime());

  const params = new URLSearchParams({
    startTask: "CERTIFICATION_NAME",
    name: cert.courseTitle,
    organizationName: organisation,
    certUrl: cert.verificationUrl,
    certId: cert.certificateCode,
  });
  if (valid) {
    params.set("issueYear", String(issued.getFullYear()));
    params.set("issueMonth", String(issued.getMonth() + 1));
  }
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

/** A WhatsApp share that works on a phone and on the desktop app alike. */
export function whatsAppShareUrl(cert: ShareableCertificate): string {
  return `https://wa.me/?text=${encodeURIComponent(certificateMessage(cert))}`;
}

/**
 * The phone's own share sheet where there is one, the clipboard where there is
 * not. Returns what happened so the caller can say something true about it.
 */
export async function shareCertificate(
  cert: ShareableCertificate,
): Promise<"shared" | "copied" | "cancelled"> {
  const text = certificateMessage(cert);
  try {
    if (navigator.share) {
      await navigator.share({ title: cert.courseTitle, text, url: cert.verificationUrl });
      return "shared";
    }
  } catch {
    // A cancelled share sheet throws. It is not a failure and nothing should
    // be said about it.
    return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "cancelled";
  }
}
