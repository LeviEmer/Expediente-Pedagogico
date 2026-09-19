import { IsString, MinLength } from "class-validator";

export class UpdateRubricDimensionDto {
  @IsString()
  @MinLength(2)
  name: string;
}
