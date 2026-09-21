import { ImageResponse } from "next/og";

import { fetchCertificateForPreview } from "./preview-data";

/**
 * The card a graduate's certificate link shows on LinkedIn.
 *
 * Drawn to look like the credential rather than like an advert: the name is the
 * largest thing on it, because the person sharing it is proud of it, and that
 * is what makes anyone else click. The verification code is on the card so a
 * sceptical reader can see there is something to check.
 */
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A verified MooreSkillUp certificate";

const INK = "#0F203C";
const ORANGE = "#FC6203";
const PAPER = "#FDFCFA";

export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const certificate = await fetchCertificateForPreview(code);

  if (!certificate?.valid) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: PAPER,
            color: INK,
          }}
        >
          <div style={{ fontSize: 30, letterSpacing: 6, color: ORANGE, fontWeight: 700 }}>
            MOORESKILLUP
          </div>
          <div style={{ marginTop: 20, fontSize: 56, fontWeight: 800 }}>Verify a certificate</div>
        </div>
      ),
      size,
    );
  }

  const issued = certificate.issuedAt
    ? new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: PAPER,
          padding: "56px 72px",
          borderBottom: `16px solid ${ORANGE}`,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 24, letterSpacing: 8, color: ORANGE, fontWeight: 700 }}>
          MOORESKILLUP
        </div>
        <div style={{ marginTop: 26, fontSize: 24, letterSpacing: 4, color: "#5A6472" }}>
          CERTIFICATE OF COMPLETION
        </div>

        <div
          style={{
            marginTop: 26,
            fontSize: certificate.studentName.length > 24 ? 64 : 78,
            fontWeight: 800,
            color: INK,
          }}
        >
          {certificate.studentName}
        </div>
        <div style={{ marginTop: 10, width: 260, height: 4, background: ORANGE }} />

        <div
          style={{
            marginTop: 26,
            fontSize: 36,
            color: INK,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {certificate.courseTitle}
        </div>

        <div style={{ marginTop: 34, display: "flex", gap: 20, fontSize: 24, color: "#5A6472" }}>
          <div style={{ display: "flex" }}>{issued}</div>
          <div style={{ display: "flex" }}>·</div>
          <div style={{ display: "flex", fontWeight: 700, color: INK }}>{code}</div>
        </div>
      </div>
    ),
    size,
  );
}
