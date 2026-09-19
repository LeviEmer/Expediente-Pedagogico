import { IsString, MinLength } from "class-validator";

export class UpdateLessonCriterionDto {
  @IsString()
  @MinLength(2)
  text: string;
}
