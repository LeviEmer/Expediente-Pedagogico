import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import { AuthenticatedUser } from "../common/types";
import { StudentsService } from "./students.service";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("students")
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Post()
  @Roles("SUPERVISOR", "INSTRUCTOR", "ADMIN")
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.studentsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.studentsService.findAll(user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.studentsService.findOne(id, user);
  }

  @Patch(":id")
  @Roles("SUPERVISOR", "ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.studentsService.update(id, dto, user);
  }
}
