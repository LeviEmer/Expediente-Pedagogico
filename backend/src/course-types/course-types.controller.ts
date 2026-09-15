import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CourseTypesService } from "./course-types.service";
import { CreateCourseTypeDto } from "./dto/create-course-type.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("course-types")
export class CourseTypesController {
  constructor(private courseTypesService: CourseTypesService) {}

  @Post()
  @Roles("SUPERVISOR")
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
}
