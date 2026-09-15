import { Module } from "@nestjs/common";
import { EnrollmentsModule } from "../enrollments/enrollments.module";
import { ClassSessionsController } from "./class-sessions.controller";
import { ClassSessionsService } from "./class-sessions.service";

@Module({
  imports: [EnrollmentsModule],
  controllers: [ClassSessionsController],
  providers: [ClassSessionsService],
})
export class ClassSessionsModule {}
