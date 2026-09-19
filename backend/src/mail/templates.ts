export const SCHOOL_NAME = "Escuela de Manejo Orellana";

const RATING_LABEL: Record<string, string> = {
  NO: "No",
  MEDIO: "Medio",
  SI: "Sí",
  NA: "No aplica",
};

function esc(value: unknown): string {
  return String(value ?? "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] as string));
}

function baseLayout(title: string, body: string): string {
  return `
  <div style="font-family: Arial, Helvetica, sans-serif; max-width: 680px; margin: 0 auto; color: #1f2933;">
    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 4px;">
      <img src="cid:school-logo" alt="" width="36" height="36" style="width: 36px; height: 36px; border-radius: 8px; border: 1px solid #e5e7eb; display: block;" />
      <p style="margin: 0; font-size: 11px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; color: #2563eb;">
        ${esc(SCHOOL_NAME)}
      </p>
    </div>
    <h1 style="font-size: 20px; border-bottom: 2px solid #1f2933; padding-bottom: 8px;">${esc(title)}</h1>
    ${body}
    <p style="margin-top: 32px; font-size: 12px; color: #6b7280;">
      Este correo fue generado automáticamente por el sistema de gestión de clases de ${esc(SCHOOL_NAME)}.
    </p>
  </div>`;
}

export function passwordResetHtml(params: { resetUrl: string }): string {
  const body = `
    <p>Recibimos una solicitud para restablecer tu contraseña.</p>
    <p>
      <a href="${esc(params.resetUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:bold;">
        Restablecer contraseña
      </a>
    </p>
    <p style="font-size:13px;color:#6b7280;">Este enlace vence en 1 hora. Si tú no lo pediste, ignora este correo — tu contraseña actual sigue funcionando.</p>
  `;
  return baseLayout("Restablecer contraseña", body);
}

type CriteriaSnapshotItem = { text: string; rating: string | null };
type RubricSnapshotItem = { name: string; level: number | null };

function criteriaTable(items: CriteriaSnapshotItem[]): string {
  if (!items?.length) return "";
  const rows = items
    .map(
      (c) => `<tr>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;">${esc(c.text)}</td>
        <td style="padding:4px 8px;border:1px solid #e5e7eb;text-align:center;">${esc(RATING_LABEL[c.rating ?? ""] ?? "—")}</td>
      </tr>`,
    )
    .join("");
  return `<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:13px;">
    <thead><tr>
      <th style="padding:4px 8px;border:1px solid #e5e7eb;text-align:left;background:#f3f4f6;">Criterio</th>
      <th style="padding:4px 8px;border:1px solid #e5e7eb;background:#f3f4f6;">Resultado</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function rubricList(items: RubricSnapshotItem[], previous?: RubricSnapshotItem[] | null): string {
  if (!items?.length) return "";
  return items
    .map((r) => {
      const prev = previous?.find((p) => p.name === r.name);
      const compare =
        prev && prev.level != null
          ? ` <span style="color:#6b7280;">(Antes: nivel ${esc(prev.level)} → Hoy: nivel ${esc(r.level ?? "—")})</span>`
          : "";
      return `<li><strong>${esc(r.name)}:</strong> Nivel ${esc(r.level ?? "—")}/4${compare}</li>`;
    })
    .join("");
}

export function dailyReportHtml(params: {
  studentName: string;
  instructorName: string;
  courseTypeName: string;
  sessionDate: Date;
  lessons: Array<{
    lessonCode: string;
    lessonName: string;
    isRepeat: boolean;
    instructorNotes: string | null;
    criteriaSnapshot: CriteriaSnapshotItem[];
    rubricSnapshot: RubricSnapshotItem[];
    previousRubricSnapshot: RubricSnapshotItem[] | null;
  }>;
}): string {
  const dateStr = params.sessionDate.toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" });

  const lessonsHtml = params.lessons
    .map(
      (l) => `
      <div style="margin-top:20px;padding:12px;border:1px solid #e5e7eb;border-radius:8px;">
        <h3 style="margin:0 0 4px 0;font-size:15px;">
          ${esc(l.lessonCode)} — ${esc(l.lessonName)}
          ${l.isRepeat ? '<span style="background:#fef3c7;color:#92400e;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:8px;">Repaso</span>' : ""}
        </h3>
        ${criteriaTable(l.criteriaSnapshot)}
        ${l.rubricSnapshot?.length ? `<ul style="margin:8px 0 0 0;padding-left:18px;font-size:13px;">${rubricList(l.rubricSnapshot, l.previousRubricSnapshot)}</ul>` : ""}
        ${l.instructorNotes ? `<p style="font-size:13px;margin-top:8px;"><strong>Notas del instructor:</strong> ${esc(l.instructorNotes)}</p>` : ""}
      </div>`,
    )
    .join("");

  const body = `
    <p>Estimado(a) <strong>${esc(params.studentName)}</strong>,</p>
    <p>Este es el reporte de la clase del <strong>${esc(dateStr)}</strong> (curso ${esc(params.courseTypeName)}), impartida por ${esc(params.instructorName)}.</p>
    ${lessonsHtml}
  `;

  return baseLayout("Reporte de clase diaria", body);
}

// Cuerpo corto del correo final — el detalle completo de las 16 lecciones va
// en el PDF adjunto (ver final-report-pdf.ts), para no mandar un correo
// gigante con todos los criterios y rúbricas del curso.
export function finalReportSummaryHtml(params: {
  studentName: string;
  courseTypeName: string;
  startDate: Date;
  endDate: Date;
  sessionsCount: number;
  generalEvaluation: {
    scores: Array<{ dimensionName: string; level: number | null }>;
    personalObservations: string | null;
  } | null;
}): string {
  const fmt = (d: Date | null) => (d ? d.toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" }) : "—");

  const evalHtml = params.generalEvaluation
    ? `
      <h2 style="font-size:16px;margin-top:24px;">Evaluación general</h2>
      <ul style="font-size:14px;">
        ${params.generalEvaluation.scores.map((s) => `<li><strong>${esc(s.dimensionName)}:</strong> Nivel ${esc(s.level ?? "—")}/4</li>`).join("")}
      </ul>
      ${params.generalEvaluation.personalObservations ? `<p><strong>Observaciones personales:</strong> ${esc(params.generalEvaluation.personalObservations)}</p>` : ""}
    `
    : "";

  const body = `
    <p>Estimado(a) <strong>${esc(params.studentName)}</strong>,</p>
    <p>Ha finalizado el curso de <strong>${esc(params.courseTypeName)}</strong>, iniciado el ${esc(fmt(params.startDate))} y finalizado el ${esc(fmt(params.endDate))}.
    Total de sesiones de clase: <strong>${esc(params.sessionsCount)}</strong>.</p>
    ${evalHtml}
    <p>Adjunto a este correo encontrarás el <strong>PDF con el detalle completo</strong> de las 16 lecciones del curso.</p>
  `;

  return baseLayout("Reporte general final", body);
}

