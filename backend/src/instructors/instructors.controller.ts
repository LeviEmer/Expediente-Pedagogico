import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import { AuthenticatedUser } from "../common/types";
import { InstructorsService } from "./instructors.service";
import { CreateInstructorDto } from "./dto/create-instructor.dto";
import { UpdateInstructorDto } from "./dto/update-instructor.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("instructors")
export class InstructorsController {
  constructor(private instructorsService: InstructorsService) {}

  @Post()
  @Roles("SUPERVISOR")
  create(@Body() dto: CreateInstructorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorsService.create(dto, user);
  }

  @Get()
  @Roles("SUPERVISOR")
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.instructorsService.findAll(user);
  }

  @Get(":id")
  @Roles("SUPERVISOR")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorsService.findOne(id, user);
  }

  @Patch(":id")
  @Roles("SUPERVISOR")
  update(@Param("id") id: string, @Body() dto: UpdateInstructorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorsService.update(id, dto, user);
  }

  @Get(":id/enrollments")
  findAssignedEnrollments(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.instructorsService.findAssignedActiveEnrollments(id, user);
  }
}
