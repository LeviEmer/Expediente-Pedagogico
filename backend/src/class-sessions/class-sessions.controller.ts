import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RolesGuard } from "../common/roles.guard";
import { Roles } from "../common/roles.decorator";
import { CurrentUser } from "../common/current-user.decorator";
import { AuthenticatedUser } from "../common/types";
import { ClassSessionsService } from "./class-sessions.service";
import { OpenSessionDto } from "./dto/open-session.dto";
import { SaveLessonsDto } from "./dto/save-lessons.dto";

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ClassSessionsController {
  constructor(private classSessionsService: ClassSessionsService) {}

  @Post("enrollments/:enrollmentId/class-sessions")
  @Roles("SUPERVISOR", "INSTRUCTOR")
  openOrGetToday(
    @Param("enrollmentId") enrollmentId: string,
    @Body() dto: OpenSessionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.classSessionsService.openOrGetTodaySession(enrollmentId, dto, user);
  }

  @Get("class-sessions/:id")
  findOne(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.classSessionsService.findOne(id, user);
  }

  @Get("enrollments/:enrollmentId/class-sessions")
  listForEnrollment(@Param("enrollmentId") enrollmentId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.classSessionsService.listForEnrollment(enrollmentId, user);
  }

  @Patch("class-sessions/:id/lessons")
  @Roles("SUPERVISOR", "INSTRUCTOR")
  saveLessons(@Param("id") id: string, @Body() dto: SaveLessonsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.classSessionsService.saveLessons(id, dto, user);
  }

  @Post("class-sessions/:id/close")
  @Roles("SUPERVISOR", "INSTRUCTOR")
  close(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.classSessionsService.close(id, user);
  }

  @Post("class-sessions/:id/resend-report")
  @Roles("SUPERVISOR", "INSTRUCTOR")
  resendReport(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.classSessionsService.resendDailyReport(id, user);
  }

  // [SUPUESTO — sección 12] Solo el supervisor puede reabrir una sesión cerrada.
  @Patch("class-sessions/:id/reopen")
  @Roles("SUPERVISOR")
  reopen(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.classSessionsService.reopen(id, user);
  }
}
