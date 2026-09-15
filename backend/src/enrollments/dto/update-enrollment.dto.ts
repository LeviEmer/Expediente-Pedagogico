import { IsBoolean, IsDateString, IsNumber, IsOptional } from "class-validator";

// Campos editables después de creada la matrícula. La transmisión no se
// incluye a propósito: cambiarla implicaría recalcular el currículo clonado
// (R1) y no está soportado en este MVP.
export class UpdateEnrollmentDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  examDate?: string;

  @IsOptional()
  @IsNumber()
  examScore?: number;

  @IsOptional()
  @IsBoolean()
  recorridoExamenes?: boolean;

  @IsOptional()
  @IsBoolean()
  localizacionHipotecarioVmtPlazaJardin?: boolean;
}
