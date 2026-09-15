import { Type } from "class-transformer";
import { IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID } from "class-validator";

export class CreateEnrollmentDto {
  @IsUUID()
  studentId: string;

  // Los IDs de CourseType del seed son fijos (no @default(uuid())) para poder
  // reseedear de forma idempotente, por lo que no siempre cumplen el formato
  // estricto de @IsUUID(); la FK de Postgres ya garantiza la integridad referencial.
  @IsString()
  @IsNotEmpty()
  courseTypeId: string;

  @IsOptional()
  @IsUUID()
  instructorId?: string;

  @IsIn(["ESTANDAR", "AUTOMATICO"])
  transmission: "ESTANDAR" | "AUTOMATICO";

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsBoolean()
  recorridoExamenes?: boolean;

  @IsOptional()
  @IsBoolean()
  localizacionHipotecarioVmtPlazaJardin?: boolean;
}
