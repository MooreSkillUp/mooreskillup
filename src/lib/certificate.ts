import { jsPDF } from "jspdf";

interface CertParams {
  recipientName: string;
  courseTitle: string;
  date: string;
  certId: string;
  institution?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  accentColor?: string;
  sealText?: string;
  verificationUrl?: string;
}

function hexToRgb(hex?: string): [number, number, number] {
  if (!hex) return [79, 70, 229];
  const clean = hex.replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const int = parseInt(value, 16);
  if (Number.isNaN(int)) return [79, 70, 229];
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

/** Auto-shrink a string to fit a max width by stepping the font size down. */
function fitFontSize(doc: jsPDF, text: string, maxWidth: number, startSize: number, minSize = 14) {
  let size = startSize;
  doc.setFontSize(size);
  while (doc.getTextWidth(text) > maxWidth && size > minSize) {
    size -= 1;
    doc.setFontSize(size);
  }
  return size;
}

export function generateCertificatePdf({
  recipientName,
  courseTitle,
  date,
  certId,
  institution = "MooreSkillUp",
  signatoryName = "MooreSkillUp Team",
  signatoryTitle = "Director of Learning",
  accentColor,
  sealText = "MooreSkillUp · Verified",
  verificationUrl,
}: CertParams) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const cx = w / 2;
  const [ar, ag, ab] = hexToRgb(accentColor);
  const gold: [number, number, number] = [196, 145, 47];

  // Background — soft ivory so the frame reads as premium paper.
  doc.setFillColor(252, 251, 248);
  doc.rect(0, 0, w, h, "F");

  // Outer accent frame + inner hairline gold frame.
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(10);
  doc.rect(22, 22, w - 44, h - 44);

  doc.setDrawColor(...gold);
  doc.setLineWidth(1.2);
  doc.rect(40, 40, w - 80, h - 80);

  // Decorative corner flourishes (short right-angle ticks in gold).
  const corner = 26;
  const drawCorner = (x: number, y: number, dx: number, dy: number) => {
    doc.line(x, y, x + dx * corner, y);
    doc.line(x, y, x, y + dy * corner);
  };
  drawCorner(40, 40, 1, 1);
  drawCorner(w - 40, 40, -1, 1);
  drawCorner(40, h - 40, 1, -1);
  drawCorner(w - 40, h - 40, -1, -1);

  // Institution band.
  doc.setFillColor(ar, ag, ab);
  doc.rect(40, 40, w - 80, 56, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(institution.toUpperCase(), cx, 76, { align: "center", charSpace: 2 });

  // Title.
  doc.setTextColor(ar, ag, ab);
  doc.setFont("times", "bold");
  doc.setFontSize(38);
  doc.text("Certificate of Completion", cx, 168, { align: "center" });

  // Gold divider under the title.
  doc.setDrawColor(...gold);
  doc.setLineWidth(1.5);
  doc.line(cx - 130, 182, cx + 130, 182);

  // Presented-to line.
  doc.setTextColor(90, 90, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("This certificate is proudly presented to", cx, 214, { align: "center" });

  // Recipient name (serif, auto-fit).
  doc.setTextColor(24, 24, 27);
  doc.setFont("times", "bolditalic");
  fitFontSize(doc, recipientName, w - 240, 44, 22);
  doc.text(recipientName, cx, 268, { align: "center" });

  doc.setDrawColor(...gold);
  doc.setLineWidth(1.5);
  const nameWidth = Math.min(460, doc.getTextWidth(recipientName) + 90);
  doc.line(cx - nameWidth / 2, 286, cx + nameWidth / 2, 286);

  // Course line.
  doc.setTextColor(70, 70, 70);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("for successfully completing the course", cx, 320, { align: "center" });

  doc.setTextColor(ar, ag, ab);
  doc.setFont("helvetica", "bold");
  fitFontSize(doc, courseTitle, w - 220, 22, 14);
  doc.text(courseTitle, cx, 352, { align: "center" });

  // Footer: signature (left) · seal (center) · date (right).
  const footerY = h - 96;

  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.7);
  doc.line(110, footerY, 300, footerY);
  doc.line(w - 300, footerY, w - 110, footerY);

  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.setTextColor(24, 24, 27);
  doc.text(signatoryName, 205, footerY - 6, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text(signatoryTitle, 205, footerY + 18, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(24, 24, 27);
  doc.text(date, w - 205, footerY - 6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(70, 70, 70);
  doc.text("Date Issued", w - 205, footerY + 18, { align: "center" });

  // Seal — concentric gold/accent rings with a check mark.
  const sealY = footerY - 2;
  doc.setDrawColor(...gold);
  doc.setLineWidth(2);
  doc.circle(cx, sealY, 30, "S");
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(1);
  doc.circle(cx, sealY, 24, "S");
  // Check mark drawn with two strokes (core PDF fonts can't render ✓).
  doc.setDrawColor(ar, ag, ab);
  doc.setLineWidth(2.4);
  doc.line(cx - 9, sealY + 1, cx - 2, sealY + 8);
  doc.line(cx - 2, sealY + 8, cx + 10, sealY - 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6);
  doc.setTextColor(120, 120, 120);
  doc.text(sealText, cx, sealY + 44, { align: "center", maxWidth: 120 });

  // Certificate ID + verification line.
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Certificate ID: ${certId}`, cx, h - 40, { align: "center" });
  if (verificationUrl) {
    doc.setFont("helvetica", "normal");
    doc.text(`Verify at ${verificationUrl}`, cx, h - 28, { align: "center" });
  }

  doc.save(`MooreSkillUp-Certificate-${certId}.pdf`);
}
