import { Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { CreateInstructorDto } from "./dto/create-instructor.dto";
import { UpdateInstructorDto } from "./dto/update-instructor.dto";

@Injectable()
export class InstructorsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInstructorDto) {
    if (dto.password) {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      const user = await this.prisma.user.create({
        data: { email: dto.email, passwordHash, role: "INSTRUCTOR" },
      });
      return this.prisma.instructor.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          userId: user.id,
        },
      });
    }
    return this.prisma.instructor.create({
      data: { firstName: dto.firstName, lastName: dto.lastName, email: dto.email },
    });
  }

  // Devuelve todos (activos e inactivos) para que el supervisor pueda
  // reactivarlos; el resto de la app filtra por "active" donde corresponde.
  findAll() {
    return this.prisma.instructor.findMany({ orderBy: [{ active: "desc" }, { firstName: "asc" }] });
  }

  async findOne(id: string) {
    const instructor = await this.prisma.instructor.findUnique({ where: { id } });
    if (!instructor) throw new NotFoundException("Instructor no encontrado");
    return instructor;
  }

  async update(id: string, dto: UpdateInstructorDto) {
    await this.findOne(id);
    return this.prisma.instructor.update({ where: { id }, data: dto });
  }

  // Alumnos activos asignados a este instructor (dashboard, sección 8).
  async findAssignedActiveEnrollments(instructorId: string) {
    return this.prisma.enrollment.findMany({
      where: { instructorId, status: "ACTIVO" },
      include: { student: true, courseType: true },
      orderBy: { startDate: "asc" },
    });
  }
}
