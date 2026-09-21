import { serverApiUrl } from "@/lib/server-api";

/**
 * What a certificate link can safely say about itself.
 *
 * Only what the verification page already shows to anyone who opens it: the
 * name, the course, the date. Nothing here is private — the whole point of a
 * verifiable certificate is that a stranger can check it — but it is still
 * worth being deliberate about which fields travel into a preview card that
 * gets pasted into group chats.
 */
export interface CertificatePreview {
  valid: boolean;
  studentName: string;
  courseTitle: string;
  issuedAt: string;
  institution: string;
}

export async function fetchCertificateForPreview(
  code: string,
): Promise<CertificatePreview | null> {
  try {
    const response = await fetch(serverApiUrl(`/api/certificates/verify/${code}/`), {
      // A certificate does not change, but it can be revoked, and a preview
      // still calling a revoked certificate valid is the one case that matters.
      next: { revalidate: 900 },
    });
    if (!response.ok) return null;
    const raw = (await response.json()) as Record<string, unknown>;
    if (!raw.valid) return { valid: false, studentName: "", courseTitle: "", issuedAt: "", institution: "" };

    return {
      valid: true,
      studentName: String(raw.studentName ?? ""),
      courseTitle: String(raw.courseTitle ?? ""),
      issuedAt: String(raw.issuedAt ?? ""),
      institution: String(raw.institution ?? "MooreSkillUp"),
    };
  } catch {
    return null;
  }
}
