import PDFDocument from "pdfkit";
import * as path from "path";
import { SCHOOL_NAME } from "./templates";

// Basado en cwd (= backend/, tanto en dev como en producción vía
// `pnpm --filter backend ...`) y no en __dirname: en modo watch, Nest
// compila a dist/src/mail/... en vez de dist/mail/... como `nest build`,
// así que una ruta relativa al archivo compilado no es estable entre los dos.
const LOGO_PATH = path.join(process.cwd(), "src", "mail", "assets", "logo.jpg");

const COLORS = {
  blue: "#2563eb",
  blueDark: "#1e3a8a",
  blueLight: "#eff6ff",
  gray900: "#111827",
  gray600: "#4b5563",
  gray400: "#9ca3af",
  gray200: "#e5e7eb",
  gray50: "#f9fafb",
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
} as const;

const RATING_LABEL: Record<string, string> = { NO: "No", MEDIO: "Medio", SI: "Sí", NA: "No aplica" };
const RATING_COLOR: Record<string, string> = { NO: COLORS.red, MEDIO: COLORS.amber, SI: COLORS.green, NA: COLORS.gray400 };

type CriteriaItem = { text: string; rating: string | null };
type RubricItem = { name: string; level: number | null };

export type FinalReportPdfParams = {
  studentName: string;
  courseTypeName: string;
  startDate: Date;
  endDate: Date;
  sessionsCount: number;
  lessons: Array<{
    lessonCode: string;
    lessonName: string;
    completedOn: Date | null;
    criteriaResults: CriteriaItem[];
    rubricScores: RubricItem[];
  }>;
  generalEvaluation: {
    scores: Array<{ dimensionName: string; level: number | null }>;
    personalObservations: string | null;
  } | null;
};

function fmt(d: Date | null): string {
  return d ? d.toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" }) : "—";
}

const MARGIN = 50;
const PAGE_WIDTH = 612; // letter
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Genera el PDF del reporte general final con pdfkit (sin navegador headless
// — liviano, apto para un servidor con poca RAM). El correo solo trae un
// resumen corto; el detalle completo de las 16 lecciones va aquí adjunto.
export function buildFinalReportPdf(params: FinalReportPdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "letter", bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // ---- Encabezado con marca ----
    doc.rect(0, 0, PAGE_WIDTH, 92).fill(COLORS.blueDark);

    const logoSize = 56;
    const logoX = MARGIN;
    const logoY = 18;
    doc.save();
    doc.roundedRect(logoX, logoY, logoSize, logoSize, 8).clip();
    doc.image(LOGO_PATH, logoX, logoY, { width: logoSize, height: logoSize });
    doc.restore();

    const textX = logoX + logoSize + 14;
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(15)
      .text(SCHOOL_NAME.toUpperCase(), textX, 24, { characterSpacing: 0.5 });
    doc.fontSize(11).font("Helvetica").text("Expediente Pedagógico", textX, 43);
    doc.font("Helvetica-Bold").fontSize(16).text("Reporte general final", textX, 60);
    doc.y = 112;

    // ---- Tarjeta de datos del alumno ----
    const cardTop = doc.y;
    doc.roundedRect(MARGIN, cardTop, CONTENT_WIDTH, 74, 6).fill(COLORS.blueLight);
    doc
      .fillColor(COLORS.gray900)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(params.studentName, MARGIN + 16, cardTop + 14);
    doc
      .fillColor(COLORS.gray600)
      .font("Helvetica")
      .fontSize(10)
      .text(`Curso: ${params.courseTypeName}`, MARGIN + 16, cardTop + 34)
      .text(`Del ${fmt(params.startDate)} al ${fmt(params.endDate)} · ${params.sessionsCount} sesiones de clase`, MARGIN + 16, cardTop + 50);
    doc.y = cardTop + 74 + 24;

    // ---- Evaluación general (si existe) primero, como resumen destacado ----
    if (params.generalEvaluation) {
      sectionTitle(doc, "Evaluación general");
      for (const s of params.generalEvaluation.scores) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor(COLORS.gray900)
          .text(s.dimensionName, MARGIN, doc.y, { continued: true, width: CONTENT_WIDTH - 70 })
          .font("Helvetica-Bold")
          .fillColor(COLORS.blue)
          .text(`  Nivel ${s.level ?? "—"}/4`, { align: "right" });
        doc.moveDown(0.3);
      }
      if (params.generalEvaluation.personalObservations) {
        doc.moveDown(0.2);
        doc.font("Helvetica-Bold").fontSize(10).fillColor(COLORS.gray900).text("Observaciones personales");
        doc.font("Helvetica").fillColor(COLORS.gray600).text(params.generalEvaluation.personalObservations);
      }
      doc.moveDown(1);
    }

    // ---- Historial de lecciones ----
    sectionTitle(doc, "Historial de lecciones");

    for (const l of params.lessons) {
      ensureSpace(doc, 70);
      const boxTop = doc.y;
      doc.rect(MARGIN, boxTop, 4, 20).fill(COLORS.blue);
      doc
        .fillColor(COLORS.gray900)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(`${l.lessonCode} — ${l.lessonName}`, MARGIN + 12, boxTop + 2, { continued: false });
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.gray400)
        .text(`Completada: ${fmt(l.completedOn)}`, MARGIN + 12, boxTop + 17);
      doc.y = boxTop + 30;

      for (const c of l.criteriaResults) {
        ensureSpace(doc, 14);
        const rowY = doc.y;
        const color = RATING_COLOR[c.rating ?? ""] ?? COLORS.gray400;
        doc.circle(MARGIN + 16, rowY + 5, 3).fill(color);
        doc
          .font("Helvetica")
          .fontSize(9.5)
          .fillColor(COLORS.gray600)
          .text(c.text, MARGIN + 28, rowY, { continued: true, width: CONTENT_WIDTH - 120 })
          .font("Helvetica-Bold")
          .fillColor(color)
          .text(`  ${RATING_LABEL[c.rating ?? ""] ?? "—"}`, { align: "right" });
        doc.moveDown(0.25);
      }

      if (l.rubricScores.length > 0) {
        doc.moveDown(0.15);
        for (const r of l.rubricScores) {
          ensureSpace(doc, 14);
          doc
            .font("Helvetica-Bold")
            .fontSize(9.5)
            .fillColor(COLORS.blue)
            .text(`${r.name}: Nivel ${r.level ?? "—"}/4`, MARGIN + 28);
          doc.moveDown(0.2);
        }
      }

      doc.moveDown(0.6);
    }

    // ---- Numeración de páginas ----
    // El pie va dentro del margen inferior de la página: si el y cae más
    // allá de `margins.bottom`, pdfkit interpreta que no cabe y agrega una
    // página en blanco extra solo para el pie — por eso se anula el margen
    // mientras se escribe.
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const prevBottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor(COLORS.gray400)
        .text(`Página ${i + 1} de ${range.count}  ·  ${SCHOOL_NAME} — Expediente Pedagógico`, MARGIN, doc.page.height - 32, {
          width: CONTENT_WIDTH,
          align: "center",
        });
      doc.page.margins.bottom = prevBottomMargin;
    }

    doc.end();
  });
}

function sectionTitle(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 40);
  doc.font("Helvetica-Bold").fontSize(13).fillColor(COLORS.gray900).text(title, MARGIN, doc.y);
  const lineY = doc.y + 4;
  doc.moveTo(MARGIN, lineY).lineTo(MARGIN + CONTENT_WIDTH, lineY).strokeColor(COLORS.gray200).lineWidth(1).stroke();
  doc.y = lineY + 12;
}

// pdfkit no crea página nueva automáticamente al usar posiciones manuales
// (rect/circle) — hay que pedirla explícitamente si no cabe lo siguiente.
function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y + needed > bottom) {
    doc.addPage();
  }
}
