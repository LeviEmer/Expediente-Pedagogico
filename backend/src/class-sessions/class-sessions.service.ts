import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MailService } from "../mail/mail.service";
import { EnrollmentsService } from "../enrollments/enrollments.service";
import { AuthenticatedUser } from "../common/types";
import { hasGlobalAccess } from "../common/branch-access";
import { OpenSessionDto } from "./dto/open-session.dto";
import { SaveLessonsDto } from "./dto/save-lessons.dto";

function dateOnly(input: Date | string): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function sameDay(a: Date, b: Date): boolean {
  return dateOnly(a).getTime() === dateOnly(b).getTime();
}

type RubricSnapshotItem = { dimensionId: string; name: string; level: number | null };
type CriteriaSnapshotItem = { criterionId: string; text: string; rating: string | null };

@Injectable()
export class ClassSessionsService {
  constructor(
    private prisma: PrismaService,
    private mail: MailService,
    private enrollmentsService: EnrollmentsService,
  ) {}

  // Aislamiento entre sucursales — nadie ve/edita sesiones de otra sucursal,
  // ni siquiera el supervisor; además un instructor solo accede a las
  // sesiones de alumnos actualmente asignados a él.
  private assertAccess(enrollment: { branchId: string; instructorId: string | null }, user?: AuthenticatedUser) {
    if (!user) return;
    if (!hasGlobalAccess(user) && enrollment.branchId !== user.branchId) {
      throw new ForbiddenException("Esta sesión no pertenece a tu sucursal");
    }
    if (user.role === "INSTRUCTOR" && enrollment.instructorId !== user.instructorId) {
      throw new ForbiddenException("Este alumno no está asignado a tu cuenta");
    }
  }

  // R2 — Una sesión por alumno por día: busca por (enrollmentId, sessionDate) antes de crear.
  // Solo puede abrirse para alumnos actualmente asignados al instructor (o por el
  // supervisor) — si el alumno pasó a otro instructor, primero debe reclamarlo
  // (EnrollmentsService.claimInstructor) antes de poder ver o capturar su clase.
  async openOrGetTodaySession(enrollmentId: string, dto: OpenSessionDto, user?: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException("Matrícula no encontrada");
    this.assertAccess(enrollment, user);

    const sessionDate = dateOnly(dto.sessionDate ?? new Date());

    const existing = await this.prisma.classSession.findUnique({
      where: { enrollmentId_sessionDate: { enrollmentId, sessionDate } },
    });
    if (existing) return existing;

    return this.prisma.classSession.create({
      data: {
        enrollmentId,
        instructorId: dto.instructorId,
        sessionDate,
        status: "ABIERTA",
      },
    });
  }

  // Timeline por sesión de una matrícula (historial día a día, sección 8).
  // Visible tanto para el instructor asignado como para el supervisor (ve todo).
  async listForEnrollment(enrollmentId: string, user?: AuthenticatedUser) {
    const enrollment = await this.prisma.enrollment.findUnique({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException("Matrícula no encontrada");
    this.assertAccess(enrollment, user);

    return this.prisma.classSession.findMany({
      where: { enrollmentId },
      include: {
        instructor: true,
        lessons: { include: { lesson: true }, orderBy: { lesson: { orderIndex: "asc" } } },
      },
      orderBy: { sessionDate: "desc" },
    });
  }

  async findOne(id: string, user?: AuthenticatedUser) {
    const session = await this.prisma.classSession.findUnique({
      where: { id },
      include: {
        enrollment: { include: { student: true, courseType: true } },
        instructor: true,
        lessons: { include: { lesson: true } },
      },
    });
    if (!session) throw new NotFoundException("Sesión no encontrada");
    this.assertAccess(session.enrollment, user);
    return session;
  }

  // R3/R4 — Captura de lecciones del día: upsert en EnrollmentLesson (editable) +
  // upsert en ClassSessionLesson de hoy (snapshot inmutable), detectando repetición.
  async saveLessons(classSessionId: string, dto: SaveLessonsDto, user?: AuthenticatedUser) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { enrollment: true },
    });
    if (!session) throw new NotFoundException("Sesión no encontrada");
    this.assertAccess(session.enrollment, user);
    if (session.status !== "ABIERTA") {
      throw new BadRequestException("La sesión ya está cerrada y no se puede editar");
    }

    const results: Array<Awaited<ReturnType<typeof this.prisma.classSessionLesson.upsert>>> = [];
    for (const lessonInput of dto.lessons) {
      const result = await this.prisma.$transaction(async (tx) => {
        const lesson = await tx.lesson.findUniqueOrThrow({
          where: { id: lessonInput.lessonId },
          include: { criteria: true, rubricDimensions: true },
        });

        let enrollmentLesson = await tx.enrollmentLesson.findUnique({
          where: { enrollmentId_lessonId: { enrollmentId: session.enrollmentId, lessonId: lesson.id } },
          include: { rubricScores: { include: { dimension: true } } },
        });
        if (!enrollmentLesson) {
          enrollmentLesson = await tx.enrollmentLesson.create({
            data: { enrollmentId: session.enrollmentId, lessonId: lesson.id },
            include: { rubricScores: { include: { dimension: true } } },
          });
        }

        // R4 — detección automática de repetición si ya se había actualizado en un día distinto.
        const autoRepeat = !!enrollmentLesson.lastUpdatedOn && !sameDay(enrollmentLesson.lastUpdatedOn, session.sessionDate);
        const isRepeat = lessonInput.isRepeat ?? autoRepeat;

        const previousRubricSnapshot: RubricSnapshotItem[] | null =
          isRepeat && enrollmentLesson.rubricScores.length > 0
            ? enrollmentLesson.rubricScores.map((s) => ({
                dimensionId: s.dimensionId,
                name: s.dimension.name,
                level: s.level,
              }))
            : null;

        for (const c of lessonInput.criteria) {
          await tx.enrollmentLessonCriterion.upsert({
            where: { enrollmentLessonId_criterionId: { enrollmentLessonId: enrollmentLesson.id, criterionId: c.criterionId } },
            create: { enrollmentLessonId: enrollmentLesson.id, criterionId: c.criterionId, rating: c.rating },
            update: { rating: c.rating },
          });
        }

        for (const r of lessonInput.rubric) {
          await tx.enrollmentLessonRubricScore.upsert({
            where: { enrollmentLessonId_dimensionId: { enrollmentLessonId: enrollmentLesson.id, dimensionId: r.dimensionId } },
            create: { enrollmentLessonId: enrollmentLesson.id, dimensionId: r.dimensionId, level: r.level },
            update: { level: r.level },
          });
        }

        const updatedLesson = await tx.enrollmentLesson.update({
          where: { id: enrollmentLesson.id },
          data: {
            isRepeat,
            instructorNotes: lessonInput.instructorNotes,
            firstTaughtOn: enrollmentLesson.firstTaughtOn ?? session.sessionDate,
            lastUpdatedOn: session.sessionDate,
          },
        });

        const criteriaSnapshot: CriteriaSnapshotItem[] = lesson.criteria.map((crit) => {
          const input = lessonInput.criteria.find((c) => c.criterionId === crit.id);
          return { criterionId: crit.id, text: crit.text, rating: input?.rating ?? null };
        });

        const rubricSnapshot: RubricSnapshotItem[] = lesson.rubricDimensions.map((dim) => {
          const input = lessonInput.rubric.find((r) => r.dimensionId === dim.id);
          return { dimensionId: dim.id, name: dim.name, level: input?.level ?? null };
        });

        // @@unique([classSessionId, lessonId]) — si se edita 2 veces el mismo día, se actualiza, no se duplica.
        const classSessionLesson = await tx.classSessionLesson.upsert({
          where: { classSessionId_lessonId: { classSessionId, lessonId: lesson.id } },
          create: {
            classSessionId,
            lessonId: lesson.id,
            isRepeat,
            instructorNotes: lessonInput.instructorNotes,
            criteriaSnapshot,
            rubricSnapshot,
            previousRubricSnapshot: previousRubricSnapshot ?? undefined,
          },
          update: {
            isRepeat,
            instructorNotes: lessonInput.instructorNotes,
            criteriaSnapshot,
            rubricSnapshot,
            previousRubricSnapshot: previousRubricSnapshot ?? undefined,
          },
        });

        return { enrollmentLessonId: updatedLesson.id, classSessionLesson };
      });

      // Fuera de la transacción: recalcula si la lección quedó "completa" (R6) y si
      // eso cierra el curso completo automáticamente.
      await this.enrollmentsService.evaluateLessonCompletion(result.enrollmentLessonId);
      await this.enrollmentsService.checkAndAutoFinish(session.enrollmentId);

      results.push(result.classSessionLesson);
    }

    return results;
  }

  // Construye y envía el correo diario; no lanza si falla (deja reportSentAt
  // en null para poder reenviarlo manualmente — sección 8 del panel de supervisor).
  private async sendDailyReportEmail(classSessionId: string): Promise<boolean> {
    const session = await this.prisma.classSession.findUniqueOrThrow({
      where: { id: classSessionId },
      include: {
        enrollment: { include: { student: true, courseType: true } },
        instructor: true,
        lessons: { include: { lesson: true } },
      },
    });

    try {
      await this.mail.sendDailyReport({
        studentEmail: session.enrollment.student.email,
        studentName: `${session.enrollment.student.firstName} ${session.enrollment.student.lastName}`,
        instructorName: `${session.instructor.firstName} ${session.instructor.lastName}`,
        courseTypeName: session.enrollment.courseType.name,
        sessionDate: session.sessionDate,
        lessons: session.lessons.map((l) => ({
          lessonCode: l.lesson.code,
          lessonName: l.lesson.name,
          isRepeat: l.isRepeat,
          instructorNotes: l.instructorNotes,
          criteriaSnapshot: l.criteriaSnapshot as unknown as CriteriaSnapshotItem[],
          rubricSnapshot: l.rubricSnapshot as unknown as RubricSnapshotItem[],
          previousRubricSnapshot: (l.previousRubricSnapshot as unknown as RubricSnapshotItem[]) ?? null,
        })),
      });
      await this.prisma.classSession.update({ where: { id: classSessionId }, data: { reportSentAt: new Date() } });
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`No se pudo enviar el reporte diario de la sesión ${classSessionId}:`, err);
      return false;
    }
  }

  // R5 — Cierre de sesión: dispara el correo diario con únicamente lo trabajado hoy.
  // El cierre se confirma aunque el correo falle — el estado ABIERTA/CERRADA no
  // debe depender de un proveedor externo; el envío se puede reintentar aparte.
  async close(classSessionId: string, user?: AuthenticatedUser) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { enrollment: true, lessons: true },
    });
    if (!session) throw new NotFoundException("Sesión no encontrada");
    this.assertAccess(session.enrollment, user);
    if (session.status === "CERRADA") return session;
    if (session.lessons.length === 0) {
      throw new BadRequestException("No se puede cerrar una sesión sin lecciones capturadas");
    }

    await this.prisma.classSession.update({ where: { id: classSessionId }, data: { status: "CERRADA" } });
    await this.sendDailyReportEmail(classSessionId);

    return this.prisma.classSession.findUniqueOrThrow({ where: { id: classSessionId } });
  }

  // Reenvío manual del correo diario si el envío original falló.
  async resendDailyReport(classSessionId: string, user?: AuthenticatedUser) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { enrollment: true },
    });
    if (!session) throw new NotFoundException("Sesión no encontrada");
    this.assertAccess(session.enrollment, user);
    if (session.status !== "CERRADA") {
      throw new BadRequestException("Solo se puede reenviar el reporte de una sesión ya cerrada");
    }
    const sent = await this.sendDailyReportEmail(classSessionId);
    return { sent };
  }

  // [SUPUESTO — sección 12] Solo el supervisor puede reabrir una sesión cerrada,
  // por ejemplo si el instructor cerró por error o necesita corregir algo —
  // y solo dentro de su propia sucursal.
  async reopen(classSessionId: string, user?: AuthenticatedUser) {
    if (user && user.role !== "SUPERVISOR" && user.role !== "ADMIN") {
      throw new ForbiddenException("Solo el supervisor puede reabrir una sesión cerrada");
    }
    const session = await this.prisma.classSession.findUnique({
      where: { id: classSessionId },
      include: { enrollment: true },
    });
    if (!session) throw new NotFoundException("Sesión no encontrada");
    this.assertAccess(session.enrollment, user);
    if (session.status !== "CERRADA") {
      throw new BadRequestException("La sesión ya está abierta");
    }
    return this.prisma.classSession.update({
      where: { id: classSessionId },
      data: { status: "ABIERTA", reportSentAt: null },
    });
  }
}
