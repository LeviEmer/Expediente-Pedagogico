import { IsOptional, IsUUID } from "class-validator";

export class ClaimInstructorDto {
  // Solo lo usa el supervisor para asignar a un instructor específico;
  // el instructor ignora este campo y siempre se asigna a sí mismo.
  @IsOptional()
  @IsUUID()
  instructorId?: string;
}
