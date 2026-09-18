import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
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
    // de su propio registro Instructor.
    const branchId = user.branchId ?? user.instructor?.branchId;
    if (!branchId) {
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
      },
    };
  }
}
