import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { InstructorsService } from "./instructors.service";
import { CreateInstructorDto } from "./dto/create-instructor.dto";
import { UpdateInstructorDto } from "./dto/update-instructor.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("instructors")
export class InstructorsController {
  constructor(private instructorsService: InstructorsService) {}

  @Post()
  @Roles("SUPERVISOR")
  create(@Body() dto: CreateInstructorDto) {
    return this.instructorsService.create(dto);
  }

  @Get()
  @Roles("SUPERVISOR")
  findAll() {
    return this.instructorsService.findAll();
  }

  @Get(":id")
  @Roles("SUPERVISOR")
  findOne(@Param("id") id: string) {
    return this.instructorsService.findOne(id);
  }

  @Patch(":id")
  @Roles("SUPERVISOR")
  update(@Param("id") id: string, @Body() dto: UpdateInstructorDto) {
    return this.instructorsService.update(id, dto);
  }

  @Get(":id/enrollments")
  findAssignedEnrollments(@Param("id") id: string) {
    return this.instructorsService.findAssignedActiveEnrollments(id);
  }
}
