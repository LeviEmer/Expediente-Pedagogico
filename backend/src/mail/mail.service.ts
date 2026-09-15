import { Injectable, Logger } from "@nestjs/common";
import { Resend } from "resend";
import { dailyReportHtml, finalReportHtml } from "./templates";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly bccAdmin: string | undefined;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.from = process.env.MAIL_FROM ?? "no-reply@tuescuela.com";
    this.bccAdmin = process.env.MAIL_BCC_ADMIN;
    if (!apiKey) {
      this.logger.warn("RESEND_API_KEY no configurado: los correos se registrarán en consola, no se enviarán.");
    }
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.resend) {
      this.logger.log(`[correo simulado] Para: ${to} | Cc: ${this.bccAdmin} | Asunto: ${subject}`);
      return { simulated: true };
    }
    return this.resend.emails.send({
      from: this.from,
      to,
      cc: this.bccAdmin ? [this.bccAdmin] : undefined,
      subject,
      html,
    });
  }

  async sendDailyReport(params: Parameters<typeof dailyReportHtml>[0] & { studentEmail: string }) {
    const html = dailyReportHtml(params);
    const dateStr = params.sessionDate.toLocaleDateString("es-CR");
    return this.send(params.studentEmail, `Reporte de clase — ${dateStr}`, html);
  }

  async sendFinalReport(params: Parameters<typeof finalReportHtml>[0] & { studentEmail: string }) {
    const html = finalReportHtml(params);
    return this.send(params.studentEmail, `Reporte general final — ${params.courseTypeName}`, html);
  }
}
