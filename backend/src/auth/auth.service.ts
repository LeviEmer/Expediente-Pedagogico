import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { instructor: true, branch: true },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException("Credenciales inválidas");
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    // La sucursal del usuario es la fuente de verdad para delimitar qué ve
    // (aislamiento entre sucursales); para instructores debe coincidir con la
    // de su propio registro Instructor. ADMIN y GENERAL_SUPERVISOR no tienen
    // una sola sucursal — ven ambas — así que branchId queda en null.
    const branchId = user.branchId ?? user.instructor?.branchId ?? null;
    if (!branchId && user.role !== "ADMIN" && user.role !== "GENERAL_SUPERVISOR") {
      throw new UnauthorizedException("Este usuario no tiene una sucursal asignada");
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      instructorId: user.instructor?.id,
      branchId,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        instructorId: user.instructor?.id ?? null,
        branchId,
        branchName: user.branch?.name ?? null,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  // Autocambio de contraseña — para el primer login con la contraseña por
  // defecto, o cuando el usuario simplemente quiere cambiarla.
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException("Usuario no encontrado");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException("La contraseña actual no es correcta");

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(newPassword, 10), mustChangePassword: false },
    });
    return { ok: true };
  }

  // "Olvidé mi contraseña" — siempre responde igual exista o no la cuenta,
  // para no revelar qué correos están registrados.
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.active) {
      const token = crypto.randomBytes(32).toString("hex");
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: hashToken(token),
          passwordResetExpiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });
      const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
      try {
        await this.mail.sendPasswordReset({
          to: user.email,
          resetUrl: `${frontendUrl}/reset-password?token=${token}`,
        });
      } catch (err) {
        // DIAGNÓSTICO TEMPORAL — quitar apenas se identifique la causa real
        // del envío colgado; no dejar el detalle del error expuesto en prod.
        throw new BadRequestException(`DEBUG mail error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return { ok: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: { passwordResetTokenHash: hashToken(token) },
    });
    if (!user || !user.passwordResetExpiresAt || user.passwordResetExpiresAt < new Date()) {
      throw new BadRequestException("El enlace para restablecer la contraseña no es válido o ya venció");
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(newPassword, 10),
        mustChangePassword: false,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
      },
    });
    return { ok: true };
  }
}
