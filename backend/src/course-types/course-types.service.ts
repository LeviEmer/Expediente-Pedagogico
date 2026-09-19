import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCourseTypeDto } from "./dto/create-course-type.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { UpdateLessonCriterionDto } from "./dto/update-lesson-criterion.dto";
import { UpdateRubricDimensionDto } from "./dto/update-rubric-dimension.dto";
import { UpdateRubricLevelDto } from "./dto/update-rubric-level.dto";

@Injectable()
export class CourseTypesService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateCourseTypeDto) {
    return this.prisma.courseType.create({ data: { name: dto.name } });
  }

  findAll() {
    return this.prisma.courseType.findMany({ where: { active: true } });
  }

  findGeneralEvaluationDimensions() {
    return this.prisma.generalEvaluationDimension.findMany({
      orderBy: { orderIndex: "asc" },
      include: { levels: { orderBy: { level: "asc" } } },
    });
  }

  findLessons(courseTypeId: string) {
    return this.prisma.lesson.findMany({
      where: { courseTypeId, active: true },
      orderBy: { orderIndex: "asc" },
      include: {
        criteria: { orderBy: { orderIndex: "asc" } },
        rubricDimensions: {
          orderBy: { orderIndex: "asc" },
          include: { levels: { orderBy: { level: "asc" } } },
        },
      },
    });
  }

  // ---- Edición de currículo — exclusivo del ADMIN. Solo permite editar
  // texto/estado de lo ya sembrado (nombre, criterios, rúbricas); no agrega
  // ni quita lecciones/criterios/dimensiones para no romper el historial de
  // matrículas que ya referencian esos IDs.
  updateLesson(id: string, dto: UpdateLessonDto) {
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }

  updateLessonCriterion(id: string, dto: UpdateLessonCriterionDto) {
    return this.prisma.lessonCriterion.update({ where: { id }, data: dto });
  }

  updateRubricDimension(id: string, dto: UpdateRubricDimensionDto) {
    return this.prisma.lessonRubricDimension.update({ where: { id }, data: dto });
  }

  updateRubricLevel(id: string, dto: UpdateRubricLevelDto) {
    return this.prisma.lessonRubricLevel.update({ where: { id }, data: dto });
  }
}
