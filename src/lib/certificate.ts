import { jsPDF } from "jspdf";

interface CertParams {
  recipientName: string;
  courseTitle: string;
  instructor: string;
  date: string;
  certId: string;
}

export function generateCertificatePdf({
  recipientName,
  courseTitle,
  instructor,
  date,
  certId,
}: CertParams) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, w, h, "F");

  // Outer border (deep blue)
  doc.setDrawColor(11, 100, 244);
  doc.setLineWidth(8);
  doc.rect(20, 20, w - 40, h - 40);

  // Inner border (orange)
  doc.setDrawColor(245, 130, 32);
  doc.setLineWidth(1.5);
  doc.rect(36, 36, w - 72, h - 72);

  // Header band
  doc.setFillColor(11, 100, 244);
  doc.rect(36, 36, w - 72, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("MOORESKILLUP", w / 2, 75, { align: "center" });

  // Title
  doc.setTextColor(11, 100, 244);
  doc.setFontSize(36);
  doc.setFont("helvetica", "bold");
  doc.text("Certificate of Completion", w / 2, 160, { align: "center" });

  // Subtitle
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.text("This is proudly presented to", w / 2, 200, { align: "center" });

  // Recipient name
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.text(recipientName, w / 2, 260, { align: "center" });

  // Decorative line under name
  doc.setDrawColor(245, 130, 32);
  doc.setLineWidth(2);
  const nameWidth = Math.min(420, doc.getTextWidth(recipientName) + 80);
  doc.line(w / 2 - nameWidth / 2, 280, w / 2 + nameWidth / 2, 280);

  // Body text
  doc.setTextColor(60, 60, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(14);
  doc.text("for successfully completing the course", w / 2, 320, { align: "center" });

  // Course title
  doc.setTextColor(11, 100, 244);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`"${courseTitle}"`, w / 2, 360, { align: "center" });

  // Footer area: instructor / date
  const footerY = h - 90;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.7);
  doc.line(100, footerY, 280, footerY);
  doc.line(w - 280, footerY, w - 100, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text(instructor, 190, footerY + 18, { align: "center" });
  doc.text(date, w - 190, footerY + 18, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text("Platform", 190, footerY + 34, { align: "center" });
  doc.text("Date Issued", w - 190, footerY + 34, { align: "center" });

  // Certificate ID
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Certificate ID: ${certId}`, w / 2, h - 30, { align: "center" });

  doc.save(`MooreSkillUp-Certificate-${certId}.pdf`);
}
