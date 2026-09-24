import { Injectable, Logger } from "@nestjs/common";
import type { SendMailOptions } from "nodemailer";
import MailComposer from "nodemailer/lib/mail-composer";
import { OAuth2Client } from "google-auth-library";
import { dailyReportHtml, finalReportSummaryHtml, passwordResetHtml, SCHOOL_NAME } from "./templates";
import { buildFinalReportPdf, FinalReportPdfParams } from "./final-report-pdf";

// Se manda por el API de Gmail (HTTPS), no por SMTP — Render bloquea el
// puerto SMTP saliente en su plan gratis, pero nunca bloquea HTTPS. La
// autorización (Client ID/Secret + Refresh Token) se hizo una sola vez desde
// Google Cloud Console + OAuth Playground, con la app en modo "Producción"
// para que el token no venza. MailComposer solo arma el mensaje MIME en
// memoria — no abre ninguna conexión de red, así que no le afecta el bloqueo
// de puerto.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly oauth2Client: OAuth2Client | null;
  private readonly from: string;
  private readonly bccAdmin: string | undefined;
  private readonly logoUrl: string;

  constructor() {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
    if (clientId && clientSecret && refreshToken) {
      this.oauth2Client = new OAuth2Client({ clientId, clientSecret });
      this.oauth2Client.setCredentials({ refresh_token: refreshToken });
    } else {
      this.oauth2Client = null;
    }
    const gmailUser = process.env.GMAIL_USER;
    const fromAddress = process.env.MAIL_FROM ?? gmailUser ?? "no-reply@tuescuela.com";
    this.from = `${SCHOOL_NAME} <${fromAddress}>`;
    this.bccAdmin = process.env.MAIL_BCC_ADMIN;
    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    this.logoUrl = `${frontendUrl}/logo.jpg`;
    if (!this.oauth2Client) {
      this.logger.warn(
        "GMAIL_CLIENT_ID/GMAIL_CLIENT_SECRET/GMAIL_REFRESH_TOKEN no configurados: los correos se registrarán en consola, no se enviarán.",
      );
    }
  }

  private async getAccessToken(): Promise<string> {
    const res = await this.oauth2Client!.getAccessToken();
    if (!res.token) throw new Error("No se pudo obtener el access token de Gmail");
    return res.token;
  }

  private async buildRawMessage(mail: SendMailOptions): Promise<string> {
    const composer = new MailComposer(mail);
    const message = await composer.compile().build();
    return message.toString("base64url");
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
    if (!this.oauth2Client) {
      this.logger.log(
        `[correo simulado] Para: ${to} | Cc: ${ccList.join(", ") || "(ninguno)"} | Asunto: ${subject}${
          extraAttachments.length ? ` | Adjuntos: ${extraAttachments.map((a) => a.filename).join(", ")}` : ""
        }`,
      );
      return { simulated: true };
    }
    const raw = await this.buildRawMessage({
      from: this.from,
      to,
      cc: ccList.length ? ccList : undefined,
      subject,
      html,
      attachments: extraAttachments,
    });
    const accessToken = await this.getAccessToken();
    const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    if (!res.ok) {
      throw new Error(`Gmail API: ${res.status} ${await res.text()}`);
    }
    return res.json();
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
