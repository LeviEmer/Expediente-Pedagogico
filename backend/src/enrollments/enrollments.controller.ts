import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import { AuthenticatedUser } from "../common/types";
import { EnrollmentsService } from "./enrollments.service";
import { CreateEnrollmentDto } from "./dto/create-enrollment.dto";
import { UpdateEnrollmentDto } from "./dto/update-enrollment.dto";
import { UpdateGeneralEvaluationDto } from "./dto/update-general-evaluation.dto";
import { ClaimInstructorDto } from "./dto/claim-instructor.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("enrollments")
export class EnrollmentsController {
  constructor(private enrollmentsService: EnrollmentsService) {}

  @Post()
  @Roles("SUPERVISOR", "INSTRUCTOR", "ADMIN")
  create(@Body() dto: CreateEnrollmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.create(dto, user);
  }

  @Get()
  @Roles("SUPERVISOR", "ADMIN", "GENERAL_SUPERVISOR")
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.findAll(user);
  }

  // Buscar alumno por nombre — para que un instructor distinto al asignado
  // pueda encontrarlo y, si el alumno pasó a su cargo, asignárselo (claim-instructor).
  // Limitado a la sucursal del usuario (aislamiento entre sucursales).
  @Get("search")
  search(@Query("q") q: string, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.search(q, user);
  }

  @Get(":id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.findOne(id, user);
  }

  @Get(":id/progress")
  progress(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.progress(id, user);
  }

  @Patch(":id")
  @Roles("SUPERVISOR", "INSTRUCTOR", "ADMIN")
  update(@Param("id") id: string, @Body() dto: UpdateEnrollmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.update(id, dto, user);
  }

  @Patch(":id/finish")
  @Roles("SUPERVISOR", "INSTRUCTOR", "ADMIN")
  finish(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.finish(id, user);
  }

  @Patch(":id/general-evaluation")
  @Roles("SUPERVISOR", "INSTRUCTOR", "ADMIN")
  updateGeneralEvaluation(
    @Param("id") id: string,
    @Body() dto: UpdateGeneralEvaluationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.enrollmentsService.updateGeneralEvaluation(id, dto, user);
  }

  // El instructor se asigna a sí mismo el alumno (handoff en la calle); el
  // supervisor puede asignarlo a cualquier instructor con instructorId en el body.
  @Patch(":id/claim-instructor")
  @Roles("SUPERVISOR", "INSTRUCTOR", "ADMIN")
  claimInstructor(@Param("id") id: string, @Body() dto: ClaimInstructorDto, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.claimInstructor(id, user, dto.instructorId);
  }

  // Reenvío manual del reporte general final si el envío original falló.
  @Post(":id/resend-final-report")
  @Roles("SUPERVISOR", "ADMIN")
  resendFinalReport(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.enrollmentsService.resendFinalReport(id, user);
  }
}
