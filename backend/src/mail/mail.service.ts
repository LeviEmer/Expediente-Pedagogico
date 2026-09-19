import { Injectable, Logger } from "@nestjs/common";
import * as nodemailer from "nodemailer";
import { dailyReportHtml, finalReportHtml } from "./templates";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly bccAdmin: string | undefined;

  constructor() {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
    this.transporter =
      gmailUser && gmailAppPassword
        ? nodemailer.createTransport({ service: "gmail", auth: { user: gmailUser, pass: gmailAppPassword } })
        : null;
    this.from = process.env.MAIL_FROM ?? gmailUser ?? "no-reply@tuescuela.com";
    this.bccAdmin = process.env.MAIL_BCC_ADMIN;
    if (!this.transporter) {
      this.logger.warn("GMAIL_USER/GMAIL_APP_PASSWORD no configurados: los correos se registrarán en consola, no se enviarán.");
    }
  }

  // `to` va al alumno (destinatario principal); `cc` es todo lo demás —
  // instructor, supervisor(es) de la sucursal y el BCC_ADMIN fijo si está
  // configurado. Filtra vacíos/duplicados para no reventar el envío.
  private async send(to: string, cc: (string | undefined | null)[], subject: string, html: string) {
    const ccList = Array.from(new Set([...cc, this.bccAdmin].filter((e): e is string => !!e && e !== to)));
    if (!this.transporter) {
      this.logger.log(`[correo simulado] Para: ${to} | Cc: ${ccList.join(", ") || "(ninguno)"} | Asunto: ${subject}`);
      return { simulated: true };
    }
    return this.transporter.sendMail({
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
