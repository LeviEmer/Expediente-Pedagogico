import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CourseTypesService } from "./course-types.service";
import { CreateCourseTypeDto } from "./dto/create-course-type.dto";
import { UpdateLessonDto } from "./dto/update-lesson.dto";
import { UpdateLessonCriterionDto } from "./dto/update-lesson-criterion.dto";
import { UpdateRubricDimensionDto } from "./dto/update-rubric-dimension.dto";
import { UpdateRubricLevelDto } from "./dto/update-rubric-level.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("course-types")
export class CourseTypesController {
  constructor(private courseTypesService: CourseTypesService) {}

  @Post()
  @Roles("SUPERVISOR", "ADMIN")
  create(@Body() dto: CreateCourseTypeDto) {
    return this.courseTypesService.create(dto);
  }

  @Get()
  findAll() {
    return this.courseTypesService.findAll();
  }

  @Get(":id/lessons")
  findLessons(@Param("id") id: string) {
    return this.courseTypesService.findLessons(id);
  }

  @Get("meta/general-evaluation-dimensions")
  findGeneralEvaluationDimensions() {
    return this.courseTypesService.findGeneralEvaluationDimensions();
  }

  // ---- Edición de currículo (solo ADMIN) ----

  @Patch("lessons/:id")
  @Roles("ADMIN")
  updateLesson(@Param("id") id: string, @Body() dto: UpdateLessonDto) {
    return this.courseTypesService.updateLesson(id, dto);
  }

  @Patch("lesson-criteria/:id")
  @Roles("ADMIN")
  updateLessonCriterion(@Param("id") id: string, @Body() dto: UpdateLessonCriterionDto) {
    return this.courseTypesService.updateLessonCriterion(id, dto);
  }

  @Patch("rubric-dimensions/:id")
  @Roles("ADMIN")
  updateRubricDimension(@Param("id") id: string, @Body() dto: UpdateRubricDimensionDto) {
    return this.courseTypesService.updateRubricDimension(id, dto);
  }

  @Patch("rubric-levels/:id")
  @Roles("ADMIN")
  updateRubricLevel(@Param("id") id: string, @Body() dto: UpdateRubricLevelDto) {
    return this.courseTypesService.updateRubricLevel(id, dto);
  }
}
