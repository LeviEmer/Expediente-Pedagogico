import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "../common/types";
import { hasGlobalAccess, resolveBranchId } from "../common/branch-access";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@Injectable()
export class StudentsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateStudentDto, user: AuthenticatedUser) {
    const { branchId: requestedBranchId, ...rest } = dto;
    return this.prisma.student.create({ data: { ...rest, branchId: resolveBranchId(user, requestedBranchId) } });
  }

  async update(id: string, dto: UpdateStudentDto, user: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.prisma.student.update({ where: { id }, data: dto });
  }

  // Aislamiento entre sucursales: cada consulta filtra por la sucursal del
  // usuario, salvo ADMIN/GENERAL_SUPERVISOR que ven ambas.
  findAll(user: AuthenticatedUser) {
    return this.prisma.student.findMany({
      where: hasGlobalAccess(user) ? {} : { branchId: user.branchId ?? undefined },
      include: { branch: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { enrollments: { include: { courseType: true } } },
    });
    if (!student) throw new NotFoundException("Alumno no encontrado");
    if (!hasGlobalAccess(user) && student.branchId !== user.branchId) {
      throw new ForbiddenException("Este alumno no pertenece a tu sucursal");
    }
    return student;
  }

  // Borrado permanente — el alumno, sus matrículas y todo lo capturado en
  // ellas (lecciones, evaluación general, clases). No hay vuelta atrás; la
  // UI ya advierte de esto antes de llamar aquí. Solo ADMIN/SUPERVISOR
  // (ver @Roles en el controller); SUPERVISOR queda limitado a su sucursal
  // por el chequeo de abajo, igual que el resto de endpoints de alumnos.
  async remove(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);

    await this.prisma.$transaction(async (tx) => {
      const enrollments = await tx.enrollment.findMany({ where: { studentId: id }, select: { id: true } });
      const enrollmentIds = enrollments.map((e) => e.id);

      const classSessions = await tx.classSession.findMany({
        where: { enrollmentId: { in: enrollmentIds } },
        select: { id: true },
      });
      const classSessionIds = classSessions.map((c) => c.id);
      await tx.classSessionLesson.deleteMany({ where: { classSessionId: { in: classSessionIds } } });
      await tx.classSession.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });

      const enrollmentLessons = await tx.enrollmentLesson.findMany({
        where: { enrollmentId: { in: enrollmentIds } },
        select: { id: true },
      });
      const enrollmentLessonIds = enrollmentLessons.map((l) => l.id);
      await tx.enrollmentLessonCriterion.deleteMany({ where: { enrollmentLessonId: { in: enrollmentLessonIds } } });
      await tx.enrollmentLessonRubricScore.deleteMany({ where: { enrollmentLessonId: { in: enrollmentLessonIds } } });
      await tx.enrollmentLesson.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });

      const evaluations = await tx.enrollmentGeneralEvaluation.findMany({
        where: { enrollmentId: { in: enrollmentIds } },
        select: { id: true },
      });
      const evaluationIds = evaluations.map((e) => e.id);
      await tx.enrollmentGeneralEvaluationScore.deleteMany({ where: { evaluationId: { in: evaluationIds } } });
      await tx.enrollmentGeneralEvaluation.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });

      await tx.enrollment.deleteMany({ where: { studentId: id } });
      await tx.student.delete({ where: { id } });
    });

    return { ok: true };
  }
}
