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

  // `to` va al alumno (destinatario principal); `cc` es todo lo demás —
  // instructor, supervisor(es) de la sucursal y el BCC_ADMIN fijo si está
  // configurado. Filtra vacíos/duplicados para no reventar la llamada a Resend.
  private async send(to: string, cc: (string | undefined | null)[], subject: string, html: string) {
    const ccList = Array.from(new Set([...cc, this.bccAdmin].filter((e): e is string => !!e && e !== to)));
    if (!this.resend) {
      this.logger.log(`[correo simulado] Para: ${to} | Cc: ${ccList.join(", ") || "(ninguno)"} | Asunto: ${subject}`);
      return { simulated: true };
    }
    return this.resend.emails.send({
      from: this.from,
      to,
      cc: ccList.length ? ccList : undefined,
      subject,
      html,
    });
  }

  async sendDailyReport(
    params: Parameters<typeof dailyReportHtml>[0] & { studentEmail: string; ccEmails?: (string | undefined | null)[] },
  ) {
    const html = dailyReportHtml(params);
    const dateStr = params.sessionDate.toLocaleDateString("es-CR");
    return this.send(params.studentEmail, params.ccEmails ?? [], `Reporte de clase — ${dateStr}`, html);
  }

  async sendFinalReport(
    params: Parameters<typeof finalReportHtml>[0] & { studentEmail: string; ccEmails?: (string | undefined | null)[] },
  ) {
    const html = finalReportHtml(params);
    return this.send(params.studentEmail, params.ccEmails ?? [], `Reporte general final — ${params.courseTypeName}`, html);
  }
}
