import { IsOptional, IsDateString, IsUUID } from "class-validator";

export class OpenSessionDto {
  @IsUUID()
  instructorId: string;

  // Si se omite, se usa la fecha de hoy (R2: una sesión por alumno por día).
  @IsOptional()
  @IsDateString()
  sessionDate?: string;
}
