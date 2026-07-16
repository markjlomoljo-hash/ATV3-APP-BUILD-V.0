// Server-side PDF rendering for dermatologist-ready reports. Runs entirely
// on Node so report layout and sensitive record compilation stay off-device.
import PDFDocument from "pdfkit";
import { ReportData, ReportImageAttachment, ReportSection } from "./types";

const GREEN = "#1f8a5f";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const PAGE_BACKGROUND = "#f3f5f4";
const PAGE_MARGIN = 48;

export const REPORT_SIGNATURE_LABELS = ["Clinician signature", "Date"] as const;

function drawPageCard(doc: PDFKit.PDFDocument) {
  doc
    .save()
    .rect(0, 0, doc.page.width, doc.page.height)
    .fill(PAGE_BACKGROUND)
    .roundedRect(20, 20, doc.page.width - 40, doc.page.height - 40, 12)
    .fillAndStroke("#ffffff", BORDER)
    .restore();
}

function drawSectionHeading(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - 105) doc.addPage();
  doc.x = PAGE_MARGIN;
  doc.moveDown(0.8);
  doc
    .fillColor(GREEN)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(title.toUpperCase(), { characterSpacing: 0.6 });
  doc
    .moveTo(PAGE_MARGIN, doc.y + 2)
    .lineTo(doc.page.width - PAGE_MARGIN, doc.y + 2)
    .strokeColor(BORDER)
    .lineWidth(1)
    .stroke();
  doc.moveDown(0.5);
  doc.fillColor(INK).font("Helvetica");
}

function drawSection(doc: PDFKit.PDFDocument, section: ReportSection) {
  drawSectionHeading(doc, section.title);

  if (section.insufficientData) {
    doc
      .fontSize(10)
      .fillColor(MUTED)
      .font("Helvetica-Oblique")
      .text(`Insufficient data — ${section.insufficientDataNote ?? "no records available."}`, {
        width: doc.page.width - PAGE_MARGIN * 2,
      });
    doc.font("Helvetica").fillColor(INK);
    return;
  }

  if (section.rows) {
    for (const row of section.rows) {
      if (doc.y > doc.page.height - 90) doc.addPage();
      const startY = doc.y;
      doc
        .fontSize(9.5)
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .text(row.label, PAGE_MARGIN, startY, { width: 160 });
      doc
        .fontSize(9.5)
        .fillColor(INK)
        .font("Helvetica")
        .text(row.value || "Not provided", PAGE_MARGIN + 170, startY, {
          width: doc.page.width - PAGE_MARGIN * 2 - 170,
        });
      doc.moveDown(0.3);
    }
  }

  if (section.table) {
    doc.moveDown(0.2);
    const colWidth = (doc.page.width - PAGE_MARGIN * 2) / section.table.headers.length;
    const headerY = doc.y;
    section.table.headers.forEach((header, index) => {
      doc
        .fontSize(8.5)
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .text(header.toUpperCase(), PAGE_MARGIN + index * colWidth, headerY, {
          width: colWidth - 6,
        });
    });
    doc.moveDown(0.4);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .strokeColor(BORDER)
      .stroke();
    doc.moveDown(0.3);

    for (const row of section.table.rows) {
      if (doc.y > doc.page.height - 90) doc.addPage();
      const rowY = doc.y;
      row.forEach((cell, index) => {
        doc
          .fontSize(8.5)
          .fillColor(INK)
          .font("Helvetica")
          .text(cell || "—", PAGE_MARGIN + index * colWidth, rowY, { width: colWidth - 6 });
      });
      doc.moveDown(0.35);
    }
  }

  if (section.notes) {
    doc.moveDown(0.2);
    for (const note of section.notes) {
      if (doc.y > doc.page.height - 90) doc.addPage();
      doc
        .fontSize(9)
        .fillColor(MUTED)
        .font("Helvetica-Oblique")
        .text(`• ${note}`, { width: doc.page.width - PAGE_MARGIN * 2 });
      doc.moveDown(0.15);
    }
    doc.font("Helvetica").fillColor(INK);
  }
}

function drawClinicianSignoff(doc: PDFKit.PDFDocument) {
  if (doc.y > doc.page.height - 135) doc.addPage();
  doc.moveDown(1.4);
  const lineY = doc.y + 18;
  doc
    .moveTo(PAGE_MARGIN, lineY)
    .lineTo(PAGE_MARGIN + 280, lineY)
    .moveTo(doc.page.width - PAGE_MARGIN - 120, lineY)
    .lineTo(doc.page.width - PAGE_MARGIN, lineY)
    .strokeColor(MUTED)
    .lineWidth(0.8)
    .stroke();
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(MUTED)
    .text(REPORT_SIGNATURE_LABELS[0], PAGE_MARGIN, lineY + 5)
    .text(REPORT_SIGNATURE_LABELS[1], doc.page.width - PAGE_MARGIN - 120, lineY + 5, {
      width: 120,
    });
}

function drawFaceAtlasImages(doc: PDFKit.PDFDocument, attachments: ReportImageAttachment[]) {
  if (attachments.length === 0) return;
  drawSectionHeading(doc, "Verified FaceAtlas Images");
  for (const attachment of attachments) {
    if (doc.y > doc.page.height - 265) doc.addPage();
    const top = doc.y;
    doc.image(attachment.bytes, PAGE_MARGIN, top, {
      fit: [doc.page.width - PAGE_MARGIN * 2, 205],
      align: "center",
      valign: "center",
    });
    doc.y = top + 210;
    doc
      .fontSize(8.5)
      .font("Helvetica")
      .fillColor(MUTED)
      .text(`FaceAtlas scan captured ${attachment.scanDate.slice(0, 10)} · ${attachment.mimeType}`, {
        width: doc.page.width - PAGE_MARGIN * 2,
        align: "center",
      });
    doc.moveDown(0.6);
  }
}

export async function renderReportPdf(
  report: ReportData,
  faceAtlasImages: ReportImageAttachment[] = [],
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.on("pageAdded", () => {
      drawPageCard(doc);
      doc.x = PAGE_MARGIN;
      doc.y = PAGE_MARGIN;
    });

    drawPageCard(doc);

    doc.rect(20, 20, doc.page.width - 40, 6).fill(GREEN);
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(INK)
      .text("AcneTrex Skin Intelligence", PAGE_MARGIN, 40, { width: 300 });
    doc
      .roundedRect(PAGE_MARGIN + 304, 42, 34, 18, 8)
      .fill(GREEN)
      .fillColor("#ffffff")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("V3", PAGE_MARGIN + 304, 47, { width: 34, align: "center" });
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(GREEN)
      .text("Dermatologist-Ready Clinical Report", PAGE_MARGIN, 70);

    doc
      .fontSize(8.5)
      .fillColor(MUTED)
      .text(`Report ID: ${report.reportId}`, doc.page.width - PAGE_MARGIN - 220, 40, {
        width: 220,
        align: "right",
      })
      .text(`Compiled: ${new Date(report.compiledAt).toLocaleString()}`, {
        width: 220,
        align: "right",
      })
      .text(
        report.secureRecordStatus === "verified_user_records"
          ? "Status: Verified user records"
          : "Status: No records found",
        { width: 220, align: "right" },
      );

    doc
      .moveTo(PAGE_MARGIN, 104)
      .lineTo(doc.page.width - PAGE_MARGIN, 104)
      .strokeColor(GREEN)
      .lineWidth(2)
      .stroke();
    doc.y = 118;

    const sections: ReportSection[] = [
      report.patientSummary,
      report.currentDiagnostics,
      report.acneHistory,
      report.skinBarrier,
      report.lesionTrends,
      report.faceAtlasHistory,
      report.routineProducts,
      report.medicationTreatmentHistory,
      report.treatmentPlans,
      report.adherenceTolerance,
      report.allergiesReactions,
      report.lifestyleContext,
      report.triggerHypotheses,
      report.forecastSummaries,
      report.evidenceCitations,
      report.confidenceNotes,
      report.providerQuestions,
    ];

    for (const section of sections) {
      drawSection(doc, section);
      if (section === report.faceAtlasHistory) drawFaceAtlasImages(doc, faceAtlasImages);
    }
    drawClinicianSignoff(doc);

    doc
      .fontSize(7.5)
      .fillColor(MUTED)
      .font("Helvetica")
      .text(
        "Privacy: generated from user-consented AcneTrex records. Generated by AcneTrex V3. This document is not a medical diagnosis and does not replace evaluation by a licensed dermatologist. Sensitive scan imagery is included only with explicit report-time consent.",
        PAGE_MARGIN,
        doc.page.height - 90,
        { width: doc.page.width - PAGE_MARGIN * 2, height: 32, align: "center" },
      );

    doc.end();
  });
}
