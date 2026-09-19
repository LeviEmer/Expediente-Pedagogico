import { IsString, MinLength } from "class-validator";

export class UpdateRubricLevelDto {
  @IsString()
  @MinLength(2)
  description: string;
}
