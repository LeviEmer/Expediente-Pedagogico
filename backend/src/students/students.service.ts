import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/types";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateStudentDto, user: AuthenticatedUser) {
    return this.prisma.student.create({ data: { ...dto, branchId: user.branchId } });
  }

  async update(id: string, dto: UpdateStudentDto, user: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.prisma.student.update({ where: { id }, data: dto });
  }

  // Aislamiento entre sucursales: cada consulta filtra por la sucursal del usuario.
  findAll(user: AuthenticatedUser) {
    return this.prisma.student.findMany({ where: { branchId: user.branchId }, orderBy: { createdAt: "desc" } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { enrollments: { include: { courseType: true } } },
    });
    if (!student) throw new NotFoundException("Alumno no encontrado");
    if (student.branchId !== user.branchId) {
      throw new ForbiddenException("Este alumno no pertenece a tu sucursal");
    }
    return student;
  }
}
