import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCourseTypeDto } from "./dto/create-course-type.dto";

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
}
