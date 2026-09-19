import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { AuthenticatedUser } from "../common/types";
import { hasGlobalAccess, resolveBranchId } from "../common/branch-access";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";
import { UpdateGeneralEvaluationDto } from "./dto/update-general-evaluation.dto";

@Injectable()
export class EnrollmentsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
  ) {}

  // R1 — Alta de matrícula: clona todas las Lesson activas del CourseType hacia
  // EnrollmentLesson (vacías), fijando el currículo de esta matrícula. La
  // matrícula queda en la sucursal del usuario que la crea; el alumno y el
  // instructor (si se especifica) deben pertenecer a esa misma sucursal.
  async create(dto: CreateEnrollmentDto, user: AuthenticatedUser) {
    const student = await this.prisma.student.findUnique({ where: { id: dto.studentId } });
    if (!student) throw new ForbiddenException("El alumno no pertenece a tu sucursal");
    const branchId = resolveBranchId(user, student.branchId);
    if (student.branchId !== branchId) {
      throw new ForbiddenException("El alumno no pertenece a tu sucursal");
    }

    if (dto.instructorId) {
      const instructor = await this.prisma.instructor.findUnique({ where: { id: dto.instructorId } });
      if (!instructor || instructor.branchId !== branchId) {
        throw new ForbiddenException("El instructor no pertenece a tu sucursal");
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const enrollment = await tx.enrollment.create({
        data: {
          branchId,
          studentId: dto.studentId,
          courseTypeId: dto.courseTypeId,
          instructorId: dto.instructorId,
          transmission: dto.transmission,
          startDate: new Date(dto.startDate),
          recorridoExamenes: dto.recorridoExamenes ?? false,
          localizacionHipotecarioVmtPlazaJardin: dto.localizacionHipotecarioVmtPlazaJardin ?? false,
        },
      });

      const allLessons = await tx.lesson.findMany({
        where: { courseTypeId: dto.courseTypeId, active: true },
      });

      // En transmisión automática no se enseñan las lecciones de clutch/cambios
      // (L00–L04): el currículo de la matrícula arranca en L05.
      const lessons =
        dto.transmission === "AUTOMATICO"
          ? allLessons.filter((l) => Number(l.code.replace(/\D/g, "")) >= 5)
          : allLessons;

      if (lessons.length > 0) {
        await tx.enrollmentLesson.createMany({
          data: lessons.map((l) => ({ enrollmentId: enrollment.id, lessonId: l.id })),
        });
      }

      return enrollment;
    });
  }

  // Listado completo de matrículas de la sucursal, para el panel de supervisor.
  // ADMIN/GENERAL_SUPERVISOR ven las de ambas sucursales (incluye el nombre
  // de sucursal para poder distinguirlas en la UI).
  findAll(user: AuthenticatedUser) {
    return this.prisma.enrollment.findMany({
      where: hasGlobalAccess(user) ? {} : { branchId: user.branchId ?? undefined },
      include: { student: true, courseType: true, instructor: true, branch: true },
      orderBy: { createdAt: "desc" },
    });
  }

  // Aislamiento entre sucursales — nadie ve matrículas de otra sucursal salvo
  // quien tiene acceso global (ADMIN, GENERAL_SUPERVISOR). Además, un
  // instructor solo puede ver el expediente de un alumno mientras esté
  // actualmente asignado a él.
  private assertAccess(enrollment: { branchId: string; instructorId: string | null }, user?: AuthenticatedUser) {
    if (!user) return;
    if (!hasGlobalAccess(user) && enrollment.branchId !== user.branchId) {
      throw new ForbiddenException("Esta matrícula no pertenece a tu sucursal");
    }
    if (user.role === "INSTRUCTOR" && enrollment.instructorId !== user.instructorId) {
      throw new ForbiddenException("Este alumno no está asignado a tu cuenta");
    }
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        student: true,
        courseType: true,
        instructor: true,
        generalEvaluation: { include: { scores: { include: { dimension: true } } } },
      },
    });
    if (!enrollment) throw new NotFoundException("Matrícula no encontrada");
    this.assertAccess(enrollment, user);
    return enrollment;
  }

  // Edición de datos generales (fecha de inicio, examen, recorrido, localización).
  // La transmisión no es editable: cambiarla requeriría recalcular el currículo
  // clonado en R1, fuera de alcance del MVP.
  async update(id: string, dto: UpdateEnrollmentDto, user?: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.prisma.enrollment.update({
      where: { id },
      data: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        examDate: dto.examDate ? new Date(dto.examDate) : undefined,
        examScore: dto.examScore,
        recorridoExamenes: dto.recorridoExamenes,
        localizacionHipotecarioVmtPlazaJardin: dto.localizacionHipotecarioVmtPlazaJardin,
      },
      include: { student: true, courseType: true, instructor: true },
    });
  }

  // Búsqueda de un alumno por nombre para que un instructor distinto al
  // asignado pueda localizarlo y, si corresponde, asignárselo (ver claimInstructor).
  // Solo expone datos mínimos — nunca el progreso/lecciones — y solo dentro de
  // la misma sucursal del usuario (aislamiento entre sucursales).
  async search(query: string, user: AuthenticatedUser) {
    if (!query || query.trim().length < 2) return [];
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        ...(hasGlobalAccess(user) ? {} : { branchId: user.branchId ?? undefined }),
        status: "ACTIVO",
        student: {
          OR: [
            { firstName: { contains: query, mode: "insensitive" } },
            { lastName: { contains: query, mode: "insensitive" } },
          ],
        },
      },
      include: { student: true, courseType: true, instructor: true },
      take: 10,
    });
    return enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      transmission: e.transmission,
      student: { firstName: e.student.firstName, lastName: e.student.lastName },
      courseType: { name: e.courseType.name },
      instructor: e.instructor ? { id: e.instructor.id, firstName: e.instructor.firstName, lastName: e.instructor.lastName } : null,
    }));
  }

  // R-handoff — reasigna el instructor a cargo de la matrícula. Un instructor
  // solo puede asignársela a sí mismo (se la "lleva" al iniciar la clase);
  // el supervisor puede asignarla a cualquiera de su misma sucursal. En
  // ambos casos la matrícula debe pertenecer a la sucursal del usuario.
  async claimInstructor(enrollmentId: string, user: AuthenticatedUser, targetInstructorId?: string) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException("Matrícula no encontrada");
    if (!hasGlobalAccess(user) && enrollment.branchId !== user.branchId) {
      throw new ForbiddenException("Esta matrícula no pertenece a tu sucursal");
    }

    const canPickAnyInstructor = user.role === "SUPERVISOR" || user.role === "ADMIN";
    const newInstructorId = canPickAnyInstructor ? (targetInstructorId ?? user.instructorId) : user.instructorId;
    if (!newInstructorId) {
      throw new ForbiddenException("No se pudo determinar el instructor a asignar");
    }

    if (canPickAnyInstructor) {
      const targetInstructor = await this.prisma.instructor.findUnique({ where: { id: newInstructorId } });
      if (!targetInstructor || targetInstructor.branchId !== enrollment.branchId) {
        throw new ForbiddenException("El instructor no pertenece a tu sucursal");
      }
    }

    return this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { instructorId: newInstructorId },
      include: { student: true, courseType: true, instructor: true },
    });
  }

  // GET /enrollments/:id/progress — estado actual de las 16 lecciones, para que
  // el instructor vea de un vistazo qué falta.
  async progress(enrollmentId: string, user?: AuthenticatedUser) {
    await this.findOne(enrollmentId, user);
    const lessons = await this.prisma.enrollmentLesson.findMany({
      where: { enrollmentId },
      include: {
        lesson: true,
        criteriaResults: { include: { criterion: true } },
        rubricScores: { include: { dimension: true } },
      },
      orderBy: { lesson: { orderIndex: "asc" } },
    });
    return lessons;
  }

  // [SUPUESTO — sección R6/12]: una lección se considera completada cuando todos
  // sus criterios están en SI/NA y todas sus dimensiones de rúbrica están en nivel 4.
  async evaluateLessonCompletion(enrollmentLessonId: string): Promise<boolean> {
    const el = await this.prisma.enrollmentLesson.findUniqueOrThrow({
      where: { id: enrollmentLessonId },
      include: {
        lesson: { include: { criteria: true, rubricDimensions: true } },
        criteriaResults: true,
        rubricScores: true,
      },
    });

    const criteriaOk = el.lesson.criteria.every((c) => {
      const result = el.criteriaResults.find((r) => r.criterionId === c.id);
      return result?.rating === "SI" || result?.rating === "NA";
    });

    const rubricOk = el.lesson.rubricDimensions.every((d) => {
      const score = el.rubricScores.find((s) => s.dimensionId === d.id);
      return score?.level === 4;
    });

    const complete = criteriaOk && rubricOk;

    await this.prisma.enrollmentLesson.update({
      where: { id: enrollmentLessonId },
      data: { completedOn: complete ? (el.completedOn ?? new Date()) : null },
    });

    return complete;
  }

  // R6(a) — si todas las lecciones de la matrícula están completas, finaliza el curso automáticamente.
  async checkAndAutoFinish(enrollmentId: string) {
    const lessons = await this.prisma.enrollmentLesson.findMany({ where: { enrollmentId } });
    if (lessons.length === 0) return;
    const allComplete = lessons.every((l) => l.completedOn != null);
    if (!allComplete) return;

    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment || enrollment.status !== "ACTIVO") return;

    await this.finish(enrollmentId);
  }

  // Construye y envía el reporte general final; usado tanto al finalizar el
  // curso como al reenviarlo manualmente si el envío original falló.
  // No lanza si el correo falla — deja finalReportSentAt en null para que se
  // pueda reintentar, sin bloquear el resto del flujo (sección 8: "reenvío
  // manual de un correo si falló").
  private async sendFinalReportEmail(enrollmentId: string): Promise<boolean> {
    const enrollment = await this.prisma.enrollment.findUniqueOrThrow({
      where: { id: enrollmentId },
      include: { student: true, courseType: true },
    });

    const lessons = await this.prisma.enrollmentLesson.findMany({
      where: { enrollmentId },
      include: {
        lesson: true,
        criteriaResults: { include: { criterion: true } },
        rubricScores: { include: { dimension: true } },
      },
      orderBy: { lesson: { orderIndex: "asc" } },
    });

    const generalEvaluation = await this.prisma.enrollmentGeneralEvaluation.findUnique({
      where: { enrollmentId },
      include: { scores: { include: { dimension: true } } },
    });

    const sessionsCount = await this.prisma.classSession.count({
      where: { enrollmentId, status: "CERRADA" },
    });

    try {
      await this.mail.sendFinalReport({
        studentEmail: enrollment.student.email,
        studentName: `${enrollment.student.firstName} ${enrollment.student.lastName}`,
        courseTypeName: enrollment.courseType.name,
        startDate: enrollment.startDate,
        endDate: enrollment.endDate ?? new Date(),
        sessionsCount,
        lessons: lessons.map((l) => ({
          lessonCode: l.lesson.code,
          lessonName: l.lesson.name,
          completedOn: l.completedOn,
          criteriaResults: l.criteriaResults.map((c) => ({ text: c.criterion.text, rating: c.rating })),
          rubricScores: l.rubricScores.map((s) => ({ name: s.dimension.name, level: s.level })),
        })),
        generalEvaluation: generalEvaluation
          ? {
              personalObservations: generalEvaluation.personalObservations,
              scores: generalEvaluation.scores.map((s) => ({
                dimensionName: s.dimension.name,
                level: s.level,
              })),
            }
          : null,
      });
      await this.prisma.enrollment.update({ where: { id: enrollmentId }, data: { finalReportSentAt: new Date() } });
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`No se pudo enviar el reporte final de la matrícula ${enrollmentId}:`, err);
      return false;
    }
  }

  // R6(b) — cierre manual del curso desde la pantalla de la matrícula.
  async finish(enrollmentId: string, user?: AuthenticatedUser) {
    await this.findOne(enrollmentId, user);
    const enrollment = await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "FINALIZADO", endDate: new Date() },
      include: { student: true, courseType: true },
    });

    await this.sendFinalReportEmail(enrollmentId);

    return enrollment;
  }

  // Reenvío manual del reporte final (panel de supervisor) cuando el envío
  // original falló o se necesita volver a mandar.
  async resendFinalReport(enrollmentId: string, user?: AuthenticatedUser) {
    const enrollment = await this.findOne(enrollmentId, user);
    if (enrollment.status !== "FINALIZADO") {
      throw new ForbiddenException("Solo se puede reenviar el reporte de un curso ya finalizado");
    }
    const sent = await this.sendFinalReportEmail(enrollmentId);
    return { sent };
  }

  async updateGeneralEvaluation(enrollmentId: string, dto: UpdateGeneralEvaluationDto, user?: AuthenticatedUser) {
    await this.findOne(enrollmentId, user);

    const evaluation = await this.prisma.enrollmentGeneralEvaluation.upsert({
      where: { enrollmentId },
      create: { enrollmentId, personalObservations: dto.personalObservations },
      update: { personalObservations: dto.personalObservations },
    });

    for (const score of dto.scores) {
      await this.prisma.enrollmentGeneralEvaluationScore.upsert({
        where: { evaluationId_dimensionId: { evaluationId: evaluation.id, dimensionId: score.dimensionId } },
        create: { evaluationId: evaluation.id, dimensionId: score.dimensionId, level: score.level },
        update: { level: score.level },
      });
    }

    return this.prisma.enrollmentGeneralEvaluation.update({
      where: { id: evaluation.id },
      data: { completedAt: new Date() },
      include: { scores: { include: { dimension: true } } },
    });
  }
}
