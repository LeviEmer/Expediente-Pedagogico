import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/types";
import { hasGlobalAccess, resolveBranchId } from "../common/branch-access";
import { CreateInstructorDto } from "./dto/create-instructor.dto";
import { UpdateInstructorDto } from "./dto/update-instructor.dto";

@Injectable()
export class InstructorsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInstructorDto, user: AuthenticatedUser) {
    const branchId = resolveBranchId(user, dto.branchId);
    if (dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const authUser = await this.prisma.user.create({
        data: { email: dto.email, passwordHash, role: "INSTRUCTOR", branchId, mustChangePassword: true },
      });
      return this.prisma.instructor.create({
        data: {
          branchId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          userId: authUser.id,
        },
      });
    }
    return this.prisma.instructor.create({
      data: { branchId, firstName: dto.firstName, lastName: dto.lastName, email: dto.email },
    });
  }

  // Aislamiento entre sucursales — devuelve todos (activos e inactivos) de la
  // sucursal del usuario, para que el supervisor pueda reactivarlos.
  // ADMIN/GENERAL_SUPERVISOR ven los de ambas sucursales.
  findAll(user: AuthenticatedUser) {
    return this.prisma.instructor.findMany({
      where: hasGlobalAccess(user) ? {} : { branchId: user.branchId ?? undefined },
      include: { branch: true },
      orderBy: [{ active: "desc" }, { firstName: "asc" }],
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const instructor = await this.prisma.instructor.findUnique({ where: { id } });
    if (!instructor) throw new NotFoundException("Instructor no encontrado");
    if (!hasGlobalAccess(user) && instructor.branchId !== user.branchId) {
      throw new ForbiddenException("Este instructor no pertenece a tu sucursal");
    }
    return instructor;
  }

  async update(id: string, dto: UpdateInstructorDto, user: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.prisma.instructor.update({ where: { id }, data: dto });
  }

  // Alumnos activos asignados a este instructor (dashboard, sección 8). Un
  // instructor solo puede ver los suyos; el supervisor puede ver los de
  // cualquier instructor de su misma sucursal.
  async findAssignedActiveEnrollments(instructorId: string, user: AuthenticatedUser) {
    const instructor = await this.findOne(instructorId, user);
    if (user.role === "INSTRUCTOR" && user.instructorId !== instructor.id) {
      throw new ForbiddenException("No puedes ver los alumnos de otro instructor");
    }
    return this.prisma.enrollment.findMany({
      where: { instructorId, status: "ACTIVO" },
      include: { student: true, courseType: true },
      orderBy: { startDate: "asc" },
    });
  }
}
