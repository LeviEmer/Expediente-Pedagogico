import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { MailModule } from "./mail/mail.module";
import { AuthModule } from "./auth/auth.module";
import { StudentsModule } from "./students/students.module";
import { InstructorsModule } from "./instructors/instructors.module";
import { CourseTypesModule } from "./course-types/course-types.module";
import { EnrollmentsModule } from "./enrollments/enrollments.module";
import { ClassSessionsModule } from "./class-sessions/class-sessions.module";
import { BranchesModule } from "./branches/branches.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    MailModule,
    AuthModule,
    StudentsModule,
    InstructorsModule,
    CourseTypesModule,
    EnrollmentsModule,
    ClassSessionsModule,
    BranchesModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
