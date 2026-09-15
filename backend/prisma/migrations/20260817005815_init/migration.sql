-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'INSTRUCTOR');

-- CreateEnum
CREATE TYPE "Transmission" AS ENUM ('ESTANDAR', 'AUTOMATICO');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVO', 'FINALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "CriterionRating" AS ENUM ('NO', 'MEDIO', 'SI', 'NA');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CourseType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lesson" (
    "id" TEXT NOT NULL,
    "courseTypeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "hasRubric" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonCriterion" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "notApplicableIfAutomatic" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LessonCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonRubricDimension" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "LessonRubricDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonRubricLevel" (
    "id" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "LessonRubricLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralEvaluationDimension" (
    "id" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GeneralEvaluationDimension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralEvaluationLevel" (
    "id" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "GeneralEvaluationLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instructor" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "userId" TEXT,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseTypeId" TEXT NOT NULL,
    "instructorId" TEXT,
    "transmission" "Transmission" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVO',
    "examDate" TIMESTAMP(3),
    "examScore" DECIMAL(65,30),
    "recorridoExamenes" BOOLEAN NOT NULL DEFAULT false,
    "localizacionHipotecarioVmtPlazaJardin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentLesson" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "isRepeat" BOOLEAN NOT NULL DEFAULT false,
    "instructorNotes" TEXT,
    "firstTaughtOn" TIMESTAMP(3),
    "lastUpdatedOn" TIMESTAMP(3),
    "completedOn" TIMESTAMP(3),

    CONSTRAINT "EnrollmentLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentLessonCriterion" (
    "id" TEXT NOT NULL,
    "enrollmentLessonId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "rating" "CriterionRating",

    CONSTRAINT "EnrollmentLessonCriterion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentLessonRubricScore" (
    "id" TEXT NOT NULL,
    "enrollmentLessonId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "level" INTEGER,

    CONSTRAINT "EnrollmentLessonRubricScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentGeneralEvaluation" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "personalObservations" TEXT,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "EnrollmentGeneralEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentGeneralEvaluationScore" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "dimensionId" TEXT NOT NULL,
    "level" INTEGER,

    CONSTRAINT "EnrollmentGeneralEvaluationScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "sessionDate" DATE NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'ABIERTA',
    "reportSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSessionLesson" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "isRepeat" BOOLEAN NOT NULL DEFAULT false,
    "instructorNotes" TEXT,
    "criteriaSnapshot" JSONB NOT NULL,
    "rubricSnapshot" JSONB NOT NULL,
    "previousRubricSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSessionLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_courseTypeId_code_key" ON "Lesson"("courseTypeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "LessonRubricLevel_dimensionId_level_key" ON "LessonRubricLevel"("dimensionId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralEvaluationLevel_dimensionId_level_key" ON "GeneralEvaluationLevel"("dimensionId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Instructor_userId_key" ON "Instructor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentLesson_enrollmentId_lessonId_key" ON "EnrollmentLesson"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentLessonCriterion_enrollmentLessonId_criterionId_key" ON "EnrollmentLessonCriterion"("enrollmentLessonId", "criterionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentLessonRubricScore_enrollmentLessonId_dimensionId_key" ON "EnrollmentLessonRubricScore"("enrollmentLessonId", "dimensionId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentGeneralEvaluation_enrollmentId_key" ON "EnrollmentGeneralEvaluation"("enrollmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentGeneralEvaluationScore_evaluationId_dimensionId_key" ON "EnrollmentGeneralEvaluationScore"("evaluationId", "dimensionId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSession_enrollmentId_sessionDate_key" ON "ClassSession"("enrollmentId", "sessionDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSessionLesson_classSessionId_lessonId_key" ON "ClassSessionLesson"("classSessionId", "lessonId");

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_courseTypeId_fkey" FOREIGN KEY ("courseTypeId") REFERENCES "CourseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonCriterion" ADD CONSTRAINT "LessonCriterion_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRubricDimension" ADD CONSTRAINT "LessonRubricDimension_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonRubricLevel" ADD CONSTRAINT "LessonRubricLevel_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "LessonRubricDimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneralEvaluationLevel" ADD CONSTRAINT "GeneralEvaluationLevel_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "GeneralEvaluationDimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Instructor" ADD CONSTRAINT "Instructor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseTypeId_fkey" FOREIGN KEY ("courseTypeId") REFERENCES "CourseType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLesson" ADD CONSTRAINT "EnrollmentLesson_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLesson" ADD CONSTRAINT "EnrollmentLesson_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLessonCriterion" ADD CONSTRAINT "EnrollmentLessonCriterion_enrollmentLessonId_fkey" FOREIGN KEY ("enrollmentLessonId") REFERENCES "EnrollmentLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLessonCriterion" ADD CONSTRAINT "EnrollmentLessonCriterion_criterionId_fkey" FOREIGN KEY ("criterionId") REFERENCES "LessonCriterion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLessonRubricScore" ADD CONSTRAINT "EnrollmentLessonRubricScore_enrollmentLessonId_fkey" FOREIGN KEY ("enrollmentLessonId") REFERENCES "EnrollmentLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentLessonRubricScore" ADD CONSTRAINT "EnrollmentLessonRubricScore_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "LessonRubricDimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentGeneralEvaluation" ADD CONSTRAINT "EnrollmentGeneralEvaluation_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentGeneralEvaluationScore" ADD CONSTRAINT "EnrollmentGeneralEvaluationScore_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "EnrollmentGeneralEvaluation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentGeneralEvaluationScore" ADD CONSTRAINT "EnrollmentGeneralEvaluationScore_dimensionId_fkey" FOREIGN KEY ("dimensionId") REFERENCES "GeneralEvaluationDimension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionLesson" ADD CONSTRAINT "ClassSessionLesson_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSessionLesson" ADD CONSTRAINT "ClassSessionLesson_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
