import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateLessonDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
