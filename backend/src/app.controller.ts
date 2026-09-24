import { Controller, Get } from "@nestjs/common";

@Controller()
export class AppController {
  @Get("health")
  health() {
    return { status: "ok" };
  }

  // DIAGNÓSTICO TEMPORAL — solo dice si las variables de Gmail están
  // presentes (nunca sus valores), para confirmar si Render las guardó bien.
  // Quitar apenas se resuelva el problema del correo.
  @Get("mail-debug")
  mailDebug() {
    return {
      GMAIL_USER: !!process.env.GMAIL_USER,
      GMAIL_CLIENT_ID: !!process.env.GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET: !!process.env.GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN: !!process.env.GMAIL_REFRESH_TOKEN,
      MAIL_FROM: !!process.env.MAIL_FROM,
    };
  }
}
