import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateUserDto {
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
