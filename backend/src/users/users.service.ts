import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

// Gestión de cuentas de supervisor / supervisor general — exclusivo del
// ADMIN. Los instructores se gestionan en instructors.service.ts.
@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Solo supervisores, supervisor general y el propio admin — no expone
  // usuarios INSTRUCTOR aquí (esos viven bajo /instructors).
  findAll() {
    return this.prisma.user.findMany({
      where: { role: { in: ["ADMIN", "SUPERVISOR", "GENERAL_SUPERVISOR"] } },
      include: { branch: true },
      orderBy: [{ role: "asc" }, { email: "asc" }],
    });
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Ya existe un usuario con ese correo");

    let branchId: string | null = null;
    if (dto.role === "SUPERVISOR") {
      if (!dto.branchId) throw new BadRequestException("Debes indicar la sucursal del supervisor");
      const branch = await this.prisma.branch.findUnique({ where: { id: dto.branchId } });
      if (!branch) throw new BadRequestException("Sucursal no encontrada");
      branchId = branch.id;
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: { email: dto.email, passwordHash, role: dto.role, branchId },
      include: { branch: true },
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Usuario no encontrado");
    if (user.role === "ADMIN") throw new BadRequestException("No se puede modificar la cuenta de administrador");

    return this.prisma.user.update({
      where: { id },
      data: {
        active: dto.active,
        passwordHash: dto.password ? await bcrypt.hash(dto.password, 10) : undefined,
      },
      include: { branch: true },
    });
  }
}
