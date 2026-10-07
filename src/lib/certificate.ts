import { jsPDF } from "jspdf";
import QRCode from "qrcode";

import { certificateArtwork } from "./certificate-artwork";

/**
 * Certificate rendering.
 *
 * Drawn in code rather than stored. A PDF is built in the browser the moment a
 * student clicks download, so nothing is kept on a server and the platform pays
 * nothing to hold thousands of files it may never serve.
 *
 * ## The artwork
 *
 * By default this draws over `public/certificate-artwork.png`, rendered from
 * the SVG beside it. The artwork holds only geometry, the logo and the seal —
 * never words — so every line of a certificate stays real text in the PDF and
 * the signatory and institution still come from the admin template.
 *
 * A caller may pass its own `backgroundImage` (a data URL) instead, and the
 * drawn frame, rules and seal are skipped for that too.
 *
 * Artwork spec: A4 landscape, any resolution — the file in `public` is
 * 3000 × 2121 (about 257 DPI, so a framed print holds up). Measured in points
 * on the 842 × 595 page, artwork must leave clear:
 *
 *   - y 165–350, the name, course and track
 *   - y 366–396, the citation
 *   - y 455–510 at x 96–268 and x 574–746, the signature and date
 *   - y 540–568 at x 58–300, the certificate ID
 *   - y 505–563 at x 726–784, the QR code
 *
 * and must supply the two signature rules at y 487, because they are only
 * drawn when there is no artwork.
 */

export interface CertificateData {
  /** The recipient's real full name — never a username. */
  recipientName: string;
  courseTitle: string;
  /** e.g. "Web Development · Frontend Development". Optional. */
  trackLabel?: string;
  /** Already formatted for display. */
  date: string;
  certId: string;
  verificationUrl?: string;
  institution?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  accentColor?: string;
  sealText?: string;
  /** Optional artwork that replaces everything decorative. */
  backgroundImage?: string;
}

/** MooreSkillUp navy and orange — the defaults when no template overrides them. */
const NAVY: RGB = [15, 32, 60];
const ORANGE: RGB = [252, 97, 4];
const INK: RGB = [26, 30, 38];
const MUTED: RGB = [88, 97, 114];
const PAPER: RGB = [253, 252, 250];

type RGB = [number, number, number];

/**
 * The citation. Deliberately says nothing a particular course could make
 * untrue, because one piece of artwork and one wording serve every
 * certificate the platform issues.
 */
const CITATION = [
  "Awarded by MooreSkillUp in recognition of the successful completion of all required coursework and",
  "assessments for the programme named above. Verify this credential using the code and QR code below.",
];

function hexToRgb(hex: string | undefined, fallback: RGB): RGB {
  if (!hex) return fallback;
  const clean = hex.replace("#", "").trim();
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = Number.parseInt(value, 16);
  if (Number.isNaN(int) || value.length !== 6) return fallback;
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Step a font size down until the text fits, so long names never overflow. */
function fitFontSize(doc: jsPDF, text: string, maxWidth: number, start: number, min: number) {
  let size = start;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxWidth && size > min) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
}

async function qrDataUrl(url: string, dark: RGB): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, {
      errorCorrectionLevel: "M",
      margin: 0,
      scale: 8,
      color: {
        dark: `#${dark.map((c) => c.toString(16).padStart(2, "0")).join("")}`,
        light: "#FFFFFFFF",
      },
    });
  } catch {
    // A missing QR should never stop someone downloading their certificate.
    return null;
  }
}

/**
 * Build the certificate and hand it to the browser as a download.
 *
 * Async because the QR code is generated as an image first.
 */
export async function generateCertificatePdf(data: CertificateData): Promise<void> {
  const doc = await renderCertificate(data);
  doc.save(`MooreSkillUp-Certificate-${data.certId}.pdf`);
}

/** The same render, returned as a data URL — used for the on-screen preview. */
export async function certificatePreviewDataUrl(data: CertificateData): Promise<string> {
  const doc = await renderCertificate(data);
  return doc.output("datauristring");
}

async function renderCertificate({
  recipientName,
  courseTitle,
  trackLabel,
  date,
  certId,
  verificationUrl,
  institution = "MooreSkillUp",
  signatoryName = "MooreSkillUp",
  signatoryTitle = "Director of Learning",
  accentColor,
  sealText = "Verified Credential",
  backgroundImage,
}: CertificateData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const cx = w / 2;

  const accent = hexToRgb(accentColor, ORANGE);

  // The house artwork, unless the caller brought its own. If it cannot be
  // fetched we fall through to the drawn frame rather than failing — a
  // certificate someone has earned should never refuse to download.
  const artwork = backgroundImage ?? (await certificateArtwork());

  if (artwork) {
    // Uploaded artwork owns the whole page; we only place the live data.
    try {
      doc.addImage(artwork, "PNG", 0, 0, w, h, undefined, "FAST");
    } catch {
      // A broken image must not produce a blank certificate.
      paintDrawnFrame(doc, w, h, accent);
    }
  } else {
    paintDrawnFrame(doc, w, h, accent);
  }

  if (!artwork) {
    // Institution, small and quiet at the top — the name below is the subject.
    // The artwork puts the logo here instead, which says the same thing better.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text(institution.toUpperCase(), cx, 84, { align: "center", charSpace: 3.2 });
  }

  // The title is drawn either way. The artwork deliberately leaves the words
  // out so they stay real text in the PDF rather than pixels in a picture.
  doc.setFont("times", "normal");
  doc.setFontSize(artwork ? 32 : 30);
  doc.setTextColor(...NAVY);
  doc.text("Certificate of Completion", cx, 126, { align: "center" });

  if (!artwork) {
    // A short accent rule instead of a full-width divider — lighter, and it
    // draws the eye down to the name rather than cutting the page in half.
    // The artwork carries its own.
    doc.setFillColor(...accent);
    doc.rect(cx - 26, 142, 52, 3, "F");
  }

  // ---- The recipient. The largest thing on the page, deliberately. --------
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  doc.text("THIS CERTIFIES THAT", cx, 190, { align: "center", charSpace: 2 });

  doc.setFont("times", "bold");
  fitFontSize(doc, recipientName, w - 260, 46, 24);
  doc.setTextColor(...INK);
  doc.text(recipientName, cx, 240, { align: "center" });

  // Hairline under the name, sized to the text rather than fixed.
  const nameWidth = Math.min(w - 240, doc.getTextWidth(recipientName) + 80);
  doc.setDrawColor(...accent);
  doc.setLineWidth(0.8);
  doc.line(cx - nameWidth / 2, 256, cx + nameWidth / 2, 256);

  // ---- The achievement ----------------------------------------------------
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...MUTED);
  doc.text("HAS SUCCESSFULLY COMPLETED", cx, 288, { align: "center", charSpace: 2 });

  doc.setFont("helvetica", "bold");
  fitFontSize(doc, courseTitle, w - 220, 21, 13);
  doc.setTextColor(...NAVY);
  doc.text(courseTitle, cx, 316, { align: "center" });

  if (trackLabel) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...MUTED);
    doc.text(trackLabel, cx, 336, { align: "center" });
  }

  // The citation. Fixed wording, true of every certificate we issue, in the
  // band the artwork leaves clear above the seal.
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...MUTED);
  CITATION.forEach((line, index) => {
    doc.text(line, cx, 374 + index * 14, { align: "center" });
  });

  // ---- Footer: signature · seal · date ------------------------------------
  const baseline = h - 108;

  if (!artwork) {
    doc.setDrawColor(190, 195, 205);
    doc.setLineWidth(0.6);
    doc.line(96, baseline, 268, baseline);
    doc.line(w - 268, baseline, w - 96, baseline);
  }

  doc.setFont("times", "italic");
  doc.setFontSize(17);
  doc.setTextColor(...INK);
  doc.text(signatoryName, 182, baseline - 8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(signatoryTitle.toUpperCase(), 182, baseline + 15, { align: "center", charSpace: 1.2 });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text(date, w - 182, baseline - 8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text("DATE ISSUED", w - 182, baseline + 15, { align: "center", charSpace: 1.2 });

  if (!artwork) {
    drawSeal(doc, cx, baseline - 12, accent, sealText);
  }

  // ---- Verification: ID bottom-left, QR bottom-right ----------------------
  doc.setFont("courier", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);
  doc.text(`ID  ${certId}`, 58, h - 44);

  if (verificationUrl) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text("Scan to verify this credential", 58, h - 32);

    const qr = await qrDataUrl(verificationUrl, NAVY);
    if (qr) {
      const size = 58;
      doc.addImage(qr, "PNG", w - 58 - size, h - 44 - size + 12, size, size, undefined, "FAST");
    }
  }

  if (artwork) {
    // Lettering for the footer bar, over the navy half of it so it is legible.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text("mooreskillup.com", 230, h - 9, { charSpace: 1.2 });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("SKILLS BEYOND THE CLASSROOM", w - 42, h - 9, { align: "right", charSpace: 1.6 });
  }

  return doc;
}

/** The drawn frame, used whenever no artwork has been uploaded. */
function paintDrawnFrame(doc: jsPDF, w: number, h: number, accent: RGB) {
  doc.setFillColor(...PAPER);
  doc.rect(0, 0, w, h, "F");

  // A navy hairline frame with an accent corner treatment: restrained, and it
  // photographs and prints better than a heavy coloured border.
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(1.4);
  doc.rect(30, 30, w - 60, h - 60);

  doc.setDrawColor(...accent);
  doc.setLineWidth(3);
  const arm = 44;
  const inset = 30;
  // Four corner brackets rather than a continuous second frame.
  doc.line(inset, inset, inset + arm, inset);
  doc.line(inset, inset, inset, inset + arm);
  doc.line(w - inset, inset, w - inset - arm, inset);
  doc.line(w - inset, inset, w - inset, inset + arm);
  doc.line(inset, h - inset, inset + arm, h - inset);
  doc.line(inset, h - inset, inset, h - inset - arm);
  doc.line(w - inset, h - inset, w - inset - arm, h - inset);
  doc.line(w - inset, h - inset, w - inset, h - inset - arm);
}

/** Concentric rings with a check mark — core PDF fonts cannot render ✓. */
function drawSeal(doc: jsPDF, cx: number, cy: number, accent: RGB, sealText: string) {
  doc.setDrawColor(...accent);
  doc.setLineWidth(1.6);
  doc.circle(cx, cy, 27, "S");

  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.7);
  doc.circle(cx, cy, 21, "S");

  doc.setDrawColor(...accent);
  doc.setLineWidth(2.6);
  doc.line(cx - 8, cy, cx - 2, cy + 7);
  doc.line(cx - 2, cy + 7, cx + 9, cy - 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(...MUTED);
  doc.text(sealText.toUpperCase(), cx, cy + 44, { align: "center", charSpace: 0.8, maxWidth: 130 });
}
