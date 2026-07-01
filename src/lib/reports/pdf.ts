// Server-side PDF rendering for dermatologist-ready reports. Runs entirely
// on Node (route handlers use the Node runtime, not Edge) so heavy layout
// work never touches the client. Designed to be lifted into a background
// worker unchanged — `renderReportPdf` is a pure function of `ReportData`.
import PDFDocument from "pdfkit";
import { ReportData, ReportSection } from "./types";

const GREEN = "#1f8a5f";
const INK = "#0f172a";
const MUTED = "#64748b";
const BORDER = "#e2e8f0";
const PAGE_MARGIN = 48;

function drawSectionHeading(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.8);
  doc
    .fillColor(GREEN)
    .fontSize(11)
    .font("Helvetica-Bold")
    .text(title.toUpperCase(), { characterSpacing: 0.6 });
  doc
    .moveTo(doc.x, doc.y + 2)
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
    section.table.headers.forEach((h, i) => {
      doc
        .fontSize(8.5)
        .fillColor(MUTED)
        .font("Helvetica-Bold")
        .text(h.toUpperCase(), PAGE_MARGIN + i * colWidth, headerY, { width: colWidth - 6 });
    });
    doc.moveDown(0.4);
    doc
      .moveTo(PAGE_MARGIN, doc.y)
      .lineTo(doc.page.width - PAGE_MARGIN, doc.y)
      .strokeColor(BORDER)
      .stroke();
    doc.moveDown(0.3);

    for (const row of section.table.rows) {
      const rowY = doc.y;
      row.forEach((cell, i) => {
        doc
          .fontSize(8.5)
          .fillColor(INK)
          .font("Helvetica")
          .text(cell || "—", PAGE_MARGIN + i * colWidth, rowY, { width: colWidth - 6 });
      });
      doc.moveDown(0.35);
      if (doc.y > doc.page.height - 90) {
        doc.addPage();
      }
    }
  }

  if (section.notes) {
    doc.moveDown(0.2);
    for (const note of section.notes) {
      doc
        .fontSize(9)
        .fillColor(MUTED)
        .font("Helvetica-Oblique")
        .text(`• ${note}`, { width: doc.page.width - PAGE_MARGIN * 2 });
      doc.moveDown(0.15);
    }
    doc.font("Helvetica").fillColor(INK);
  }

  if (doc.y > doc.page.height - 90) {
    doc.addPage();
  }
}

export async function renderReportPdf(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Header
    doc
      .rect(0, 0, doc.page.width, 6)
      .fill(GREEN);
    doc.fillColor(INK);
    doc.moveDown(1.2);
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .fillColor(INK)
      .text("AcneTrex Skin Intelligence", PAGE_MARGIN, 40);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(GREEN)
      .text("Clinical Reporting Services • Model V3.0", PAGE_MARGIN, 66);

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

    doc.moveDown(1.5);
    doc
      .moveTo(PAGE_MARGIN, 100)
      .lineTo(doc.page.width - PAGE_MARGIN, 100)
      .strokeColor(GREEN)
      .lineWidth(2)
      .stroke();
    doc.y = 116;

    const sections: ReportSection[] = [
      report.patientSummary,
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
      report.confidenceNotes,
      report.providerQuestions,
    ];

    for (const section of sections) {
      drawSection(doc, section);
    }

    doc.moveDown(1);
    doc
      .fontSize(7.5)
      .fillColor(MUTED)
      .font("Helvetica")
      .text(
        "Generated by AcneTrex V3. This document is not a medical diagnosis and does not replace evaluation by a licensed dermatologist. Data reflects only what the user has explicitly recorded and consented to include. Sensitive scan imagery is included only with explicit user consent captured at report generation time.",
        PAGE_MARGIN,
        doc.page.height - 60,
        { width: doc.page.width - PAGE_MARGIN * 2, align: "center" },
      );

    doc.end();
  });
}
