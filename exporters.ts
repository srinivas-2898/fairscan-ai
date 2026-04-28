import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";

export type FairnessExport = {
  title: string;
  generatedFor: string;
  candidatesCount: number;
  fairnessBefore: number;
  fairnessAfter: number;
  metrics: { dim: string; before: number; after: number }[];
  candidates?: { name: string; gender: string; ethnicity: string; score: number; selected: boolean }[];
};

const BRAND = {
  primary: [0, 217, 255] as [number, number, number],
  dark: [10, 15, 44] as [number, number, number],
  muted: [120, 130, 160] as [number, number, number],
};

export const buildFairnessPdf = (data: FairnessExport): Blob => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header band
  doc.setFillColor(...BRAND.dark);
  doc.rect(0, 0, W, 90, "F");
  doc.setFillColor(...BRAND.primary);
  doc.rect(0, 86, W, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("FAIRSCAN AI", 40, 45);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Ethical AI Audit · Fairness Report", 40, 64);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), W - 40, 45, { align: "right" });

  // Title block
  doc.setTextColor(20, 25, 50);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(data.title, 40, 130);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.muted);
  doc.text(`Generated for: ${data.generatedFor}`, 40, 148);
  doc.text(`Candidates analyzed: ${data.candidatesCount}`, 40, 162);

  // Score cards
  const drawCard = (x: number, label: string, value: number, color: [number, number, number]) => {
    doc.setDrawColor(220, 225, 235);
    doc.setFillColor(248, 249, 252);
    doc.roundedRect(x, 185, 240, 80, 8, 8, "FD");
    doc.setTextColor(...BRAND.muted);
    doc.setFontSize(10);
    doc.text(label, x + 16, 208);
    doc.setTextColor(...color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    doc.text(`${Math.round(value)}`, x + 16, 250);
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.muted);
    doc.text("/ 100", x + 16 + doc.getTextWidth(`${Math.round(value)}`) + 8, 250);
  };
  drawCard(40, "Fairness BEFORE mitigation", data.fairnessBefore, [220, 70, 90]);
  drawCard(295, "Fairness AFTER mitigation", data.fairnessAfter, [50, 200, 130]);

  // Metrics table
  autoTable(doc, {
    startY: 290,
    head: [["Dimension", "Before", "After", "Δ Improvement"]],
    body: data.metrics.map(m => [m.dim, m.before, m.after, `+${m.after - m.before}`]),
    theme: "grid",
    headStyles: { fillColor: [10, 15, 44], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 10, cellPadding: 8 },
    alternateRowStyles: { fillColor: [248, 249, 252] },
  });

  if (data.candidates?.length) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 24,
      head: [["#", "Name", "Gender", "Ethnicity", "Score", "Selected"]],
      body: data.candidates.slice(0, 30).map((c, i) => [
        i + 1, c.name, c.gender, c.ethnicity, c.score, c.selected ? "Yes" : "No",
      ]),
      theme: "striped",
      headStyles: { fillColor: [0, 150, 200], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 6 },
    });
  }

  // Footer
  const pages = (doc as any).internal.pages.length - 1;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.muted);
    doc.text("FAIRSCAN AI · Confidential audit report", 40, doc.internal.pageSize.getHeight() - 20);
    doc.text(`Page ${i} of ${pages}`, W - 40, doc.internal.pageSize.getHeight() - 20, { align: "right" });
  }

  return doc.output("blob");
};

export const buildCertificatePdf = async (org: string, score: number, certId: string): Promise<Blob> => {
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  // Palette — premium navy + gold
  const NAVY: [number, number, number] = [8, 12, 36];
  const NAVY_2: [number, number, number] = [16, 22, 56];
  const GOLD: [number, number, number] = [212, 175, 55];
  const GOLD_LIGHT: [number, number, number] = [245, 220, 130];
  const CYAN: [number, number, number] = [0, 217, 255];
  const PARCH: [number, number, number] = [232, 232, 244];

  // ---------- Background ----------
  // Subtle vertical navy gradient (faked with stripes)
  for (let i = 0; i < H; i += 2) {
    const t = i / H;
    const r = NAVY[0] + (NAVY_2[0] - NAVY[0]) * t;
    const g = NAVY[1] + (NAVY_2[1] - NAVY[1]) * t;
    const b = NAVY[2] + (NAVY_2[2] - NAVY[2]) * t;
    doc.setFillColor(r, g, b);
    doc.rect(0, i, W, 2, "F");
  }

  // ---------- Decorative ornate border (double gold lines + corner flourishes) ----------
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2.4);
  doc.rect(28, 28, W - 56, H - 56);
  doc.setLineWidth(0.6);
  doc.rect(36, 36, W - 72, H - 72);

  // Corner flourishes
  const corner = (x: number, y: number, dx: number, dy: number) => {
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(1);
    doc.line(x, y, x + 30 * dx, y);
    doc.line(x, y, x, y + 30 * dy);
    doc.setLineWidth(0.4);
    doc.line(x + 6 * dx, y + 6 * dy, x + 22 * dx, y + 6 * dy);
    doc.line(x + 6 * dx, y + 6 * dy, x + 6 * dx, y + 22 * dy);
    // diamond accent
    doc.setFillColor(...GOLD);
    doc.triangle(x + 4 * dx, y + 4 * dy, x + 8 * dx, y + 4 * dy, x + 6 * dx, y + 8 * dy, "F");
  };
  corner(36, 36, 1, 1);
  corner(W - 36, 36, -1, 1);
  corner(36, H - 36, 1, -1);
  corner(W - 36, H - 36, -1, -1);

  // Top ribbon band
  doc.setFillColor(...GOLD);
  doc.rect(W / 2 - 110, 56, 220, 22, "F");
  doc.setFillColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("FAIRSCAN AI · ETHICAL AI VERIFIED", W / 2, 71, { align: "center" });

  // ---------- Header text ----------
  doc.setTextColor(...GOLD_LIGHT);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(11);
  doc.text("Independent Bias & Fairness Audit", W / 2, 110, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(40);
  doc.setTextColor(255, 255, 255);
  doc.text("Certificate of Fairness", W / 2, 155, { align: "center" });

  // Gold underline under the title
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(W / 2 - 90, 168, W / 2 + 90, 168);
  doc.setFillColor(...GOLD);
  doc.circle(W / 2, 168, 3, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...PARCH);
  doc.text("This certifies that", W / 2, 200, { align: "center" });

  // Org name — large, gold
  doc.setFont("times", "bolditalic");
  doc.setFontSize(34);
  doc.setTextColor(...GOLD);
  doc.text(org, W / 2, 240, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...PARCH);
  doc.text(
    "has successfully completed an independent FAIRSCAN AI audit",
    W / 2, 270, { align: "center" }
  );
  doc.text(
    "for bias, demographic parity, and ethical AI compliance.",
    W / 2, 288, { align: "center" }
  );

  // ---------- Score badge (big circular gold seal at left-center) ----------
  const sx = 130, sy = 360;
  // Outer ring
  doc.setFillColor(...GOLD);
  doc.circle(sx, sy, 60, "F");
  doc.setFillColor(...NAVY);
  doc.circle(sx, sy, 52, "F");
  doc.setDrawColor(...GOLD_LIGHT);
  doc.setLineWidth(0.8);
  doc.circle(sx, sy, 52);
  // Inner ring decorative dashes
  doc.setLineWidth(0.5);
  for (let a = 0; a < 360; a += 15) {
    const rad = (a * Math.PI) / 180;
    const x1 = sx + Math.cos(rad) * 56;
    const y1 = sy + Math.sin(rad) * 56;
    const x2 = sx + Math.cos(rad) * 60;
    const y2 = sy + Math.sin(rad) * 60;
    doc.setDrawColor(...NAVY);
    doc.line(x1, y1, x2, y2);
  }
  // Score
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...GOLD);
  doc.text(`${Math.round(score)}`, sx, sy + 4, { align: "center" });
  doc.setFontSize(9);
  doc.setTextColor(...PARCH);
  doc.text("/ 100", sx, sy + 22, { align: "center" });
  // Label arc above
  doc.setFontSize(7);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text("FAIRNESS SCORE", sx, sy - 30, { align: "center" });

  // ---------- Verdict text (center) ----------
  const grade = score >= 90 ? "PLATINUM" : score >= 80 ? "GOLD" : score >= 70 ? "SILVER" : "BRONZE";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD);
  doc.text(`AWARDED ${grade} TIER COMPLIANCE`, W / 2, 360, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...PARCH);
  const lines = [
    "Audit conducted using FAIRSCAN AI's protected-attribute disparate-impact",
    "framework, aligned with the EU AI Act, NYC Local Law 144, ISO/IEC 42001,",
    "and SOC 2 Type II controls. All findings cryptographically logged.",
  ];
  lines.forEach((l, i) => doc.text(l, W / 2, 380 + i * 14, { align: "center" }));

  // ---------- QR (right) ----------
  let qrDataUrl: string | null = null;
  try {
    qrDataUrl = await QRCode.toDataURL(`https://fairscan.ai/verify/${certId}`, {
      margin: 1, width: 220, color: { dark: "#0a1024", light: "#ffffff" },
    });
  } catch { qrDataUrl = null; }
  const qx = W - 200, qy = 310;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qx - 8, qy - 8, 116, 116, 4, 4, "F");
  if (qrDataUrl) doc.addImage(qrDataUrl, "PNG", qx, qy, 100, 100);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text("SCAN TO VERIFY", qx + 50, qy + 116, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...PARCH);
  doc.text(`fairscan.ai/verify/${certId.slice(0, 14)}`, qx + 50, qy + 126, { align: "center" });

  // ---------- Signature block + cert ID footer ----------
  const sigY = H - 110;
  // Signature line
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(120, sigY, 320, sigY);
  doc.setFont("times", "italic");
  doc.setFontSize(18);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text("Dr. E. Voss", 220, sigY - 4, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PARCH);
  doc.text("DR. ELENA VOSS · CHIEF AUDIT OFFICER", 220, sigY + 12, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text("FAIRSCAN AI · Ethics Board", 220, sigY + 22, { align: "center" });

  // Issued date column
  doc.setDrawColor(...GOLD);
  doc.line(W - 320, sigY, W - 120, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text(new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), W - 220, sigY - 4, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...PARCH);
  doc.text("DATE OF ISSUE", W - 220, sigY + 12, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...GOLD_LIGHT);
  doc.text("Valid for 12 months from issue", W - 220, sigY + 22, { align: "center" });

  // ---------- Footer cert ID ----------
  doc.setFillColor(...NAVY);
  doc.rect(60, H - 56, W - 120, 22, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.4);
  doc.rect(60, H - 56, W - 120, 22);
  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...GOLD);
  doc.text(`CERTIFICATE ID  ·  ${certId}`, W / 2, H - 41, { align: "center" });

  return doc.output("blob");
};

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const buildCsv = (rows: Record<string, any>[]): Blob => {
  if (!rows.length) return new Blob([""], { type: "text/csv" });
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ].join("\n");
  return new Blob([csv], { type: "text/csv;charset=utf-8" });
};
