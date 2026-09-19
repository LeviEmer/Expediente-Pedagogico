import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

// El ADMIN usa este endpoint para dar de alta supervisores de sucursal o el
// supervisor general (solo lectura, ambas sucursales). Los instructores se
// gestionan aparte (POST /instructors), y no hay más de un ADMIN.
// branchId es obligatorio cuando role === "SUPERVISOR" (validado en el
// servicio, no aquí) e ignorado para GENERAL_SUPERVISOR.
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsIn(["SUPERVISOR", "GENERAL_SUPERVISOR"])
  role: "SUPERVISOR" | "GENERAL_SUPERVISOR";

  @IsOptional()
  @IsString()
  branchId?: string;
}
