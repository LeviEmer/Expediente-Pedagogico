import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { dailyReportHtml, finalReportSummaryHtml, passwordResetHtml, SCHOOL_NAME } from "./templates";
import { buildFinalReportPdf, FinalReportPdfParams } from "./final-report-pdf";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly bccAdmin: string | undefined;
  private readonly logoUrl: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    // Resend, sin un dominio propio verificado, solo deja enviar desde su
    // remitente de pruebas — por eso el "from" no usa MAIL_FROM/GMAIL_USER
    // como antes con Gmail SMTP. Cuando la escuela tenga dominio propio, se
    // verifica en Resend y este remitente pasa a ser el de ese dominio.
    this.from = `${SCHOOL_NAME} <onboarding@resend.dev>`;
    this.bccAdmin = process.env.MAIL_BCC_ADMIN;
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    this.logoUrl = `${frontendUrl}/logo.jpg`;
    if (!this.resend) {
      this.logger.warn("RESEND_API_KEY no configurado: los correos se registrarán en consola, no se enviarán.");
    }
  }

  // `to` va al alumno (destinatario principal); `cc` es todo lo demás —
  // instructor, supervisor(es) de la sucursal y el BCC_ADMIN fijo si está
  // configurado. Filtra vacíos/duplicados para no reventar el envío.
  private async send(
    to: string,
    cc: (string | undefined | null)[],
    subject: string,
    html: string,
    extraAttachments: { filename: string; content: Buffer }[] = [],
    includeBccAdmin = true,
  ) {
    const ccList = Array.from(
      new Set([...cc, includeBccAdmin ? this.bccAdmin : undefined].filter((e): e is string => !!e && e !== to)),
    );
    if (!this.resend) {
      this.logger.log(
        `[correo simulado] Para: ${to} | Cc: ${ccList.join(", ") || "(ninguno)"} | Asunto: ${subject}${
          extraAttachments.length ? ` | Adjuntos: ${extraAttachments.map((a) => a.filename).join(", ")}` : ""
        }`,
      );
      return { simulated: true };
    }
    const result = await this.resend.emails.send({
      from: this.from,
      to,
      cc: ccList.length ? ccList : undefined,
      subject,
      html,
      attachments: extraAttachments.length ? extraAttachments : undefined,
    });
    if (result.error) {
      throw new Error(`Resend: ${result.error.message}`);
    }
    return result.data;
  }

  async sendDailyReport(
    params: Omit<Parameters<typeof dailyReportHtml>[0], "logoUrl"> & {
      studentEmail: string;
      ccEmails?: (string | undefined | null)[];
    },
  ) {
    const html = dailyReportHtml({ ...params, logoUrl: this.logoUrl });
    const dateStr = params.sessionDate.toLocaleDateString("es-CR");
    return this.send(params.studentEmail, params.ccEmails ?? [], `${SCHOOL_NAME} — Reporte de clase — ${dateStr}`, html);
  }

  async sendFinalReport(params: FinalReportPdfParams & { studentEmail: string; ccEmails?: (string | undefined | null)[] }) {
    const html = finalReportSummaryHtml({ ...params, logoUrl: this.logoUrl });
    const pdf = await buildFinalReportPdf(params);
    const fileName = `reporte-final-${params.studentName.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}.pdf`;
    return this.send(
      params.studentEmail,
      params.ccEmails ?? [],
      `${SCHOOL_NAME} — Reporte general final — ${params.courseTypeName}`,
      html,
      [{ filename: fileName, content: pdf }],
    );
  }

  // Sin BCC_ADMIN a propósito: es un correo de seguridad con un enlace de
  // acceso, no un reporte para el equipo.
  async sendPasswordReset(params: { to: string; resetUrl: string }) {
    const html = passwordResetHtml({ resetUrl: params.resetUrl, logoUrl: this.logoUrl });
    return this.send(params.to, [], `${SCHOOL_NAME} — Restablecer contraseña`, html, [], false);
  }
}
