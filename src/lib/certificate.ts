import { jsPDF } from "jspdf";
import QRCode from "qrcode";

/**
 * Certificate rendering.
 *
 * Drawn in code rather than stored. A PDF is built in the browser the moment a
 * student clicks download, so nothing is kept on a server and the platform pays
 * nothing to hold thousands of files it may never serve.
 *
 * ## Replacing this with your own artwork
 *
 * Pass `backgroundImage` (a data URL or same-origin URL) and the drawn frame,
 * band and seal are skipped — your design becomes the page and only the live
 * data is laid over it. Nothing else changes, which is why swapping the design
 * is an upload rather than a code change.
 *
 * Artwork spec: **2000 × 1414 px** (A4 landscape at print quality). Leave the
 * centre band clear for the recipient's name, the lower left clear for the
 * certificate ID, and the lower right clear for the QR code.
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
const MUTED: RGB = [110, 118, 132];
const PAPER: RGB = [253, 252, 250];

type RGB = [number, number, number];

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

  if (backgroundImage) {
    // Uploaded artwork owns the whole page; we only place the live data.
    try {
      doc.addImage(backgroundImage, "PNG", 0, 0, w, h, undefined, "FAST");
    } catch {
      // A broken image must not produce a blank certificate.
      paintDrawnFrame(doc, w, h, accent);
    }
  } else {
    paintDrawnFrame(doc, w, h, accent);
  }

  if (!backgroundImage) {
    // Institution, small and quiet at the top — the name below is the subject.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text(institution.toUpperCase(), cx, 84, { align: "center", charSpace: 3.2 });

    doc.setFont("times", "normal");
    doc.setFontSize(30);
    doc.setTextColor(...NAVY);
    doc.text("Certificate of Completion", cx, 126, { align: "center" });

    // A short accent rule instead of a full-width divider — lighter, and it
    // draws the eye down to the name rather than cutting the page in half.
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

  // ---- Footer: signature · seal · date ------------------------------------
  const baseline = h - 108;

  if (!backgroundImage) {
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

  if (!backgroundImage) {
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
