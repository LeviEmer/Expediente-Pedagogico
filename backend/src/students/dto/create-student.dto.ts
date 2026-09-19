import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreateStudentDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  documentId?: string;

  // Solo relevante para ADMIN (no tiene sucursal propia, debe indicarla).
  // Cualquier otro rol la ignora y usa la suya.
  @IsOptional()
  @IsString()
  branchId?: string;
}
