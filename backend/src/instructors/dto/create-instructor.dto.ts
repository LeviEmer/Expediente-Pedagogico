import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateInstructorDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string; // si se provee, crea también el User de login para este instructor

  // Solo relevante para ADMIN (no tiene sucursal propia, debe indicarla).
  // Cualquier otro rol la ignora y usa la suya.
  @IsOptional()
  @IsString()
  branchId?: string;
}
