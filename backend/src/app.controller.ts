import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller()
export class AppController {
  constructor(private prisma: PrismaService) {}

  // Toca la base de datos a propósito — UptimeRobot pinguea esto cada 5
  // minutos para mantener despierto el backend en Render, pero si esto no
  // consulta la base de datos, Supabase igual se pausa solo por inactividad
  // (como pasó: el health check nunca la tocaba). Una consulta mínima
  // ("SELECT 1") cuenta como actividad real para Supabase también.
  @Get("health")
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}
