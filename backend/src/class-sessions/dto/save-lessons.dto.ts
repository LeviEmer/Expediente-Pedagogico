import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";

class CriterionResultDto {
  @IsUUID()
  criterionId: string;

  @IsIn(["NO", "MEDIO", "SI", "NA"])
  rating: "NO" | "MEDIO" | "SI" | "NA";
}

class RubricScoreDto {
  @IsUUID()
  dimensionId: string;

  @IsInt()
  @Min(1)
  @Max(4)
  level: number;
}

class SessionLessonDto {
  @IsUUID()
  lessonId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CriterionResultDto)
  criteria: CriterionResultDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubricScoreDto)
  rubric: RubricScoreDto[];

  @IsOptional()
  @IsBoolean()
  isRepeat?: boolean;

  @IsOptional()
  @IsString()
  instructorNotes?: string;
}

export class SaveLessonsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionLessonDto)
  lessons: SessionLessonDto[];
}
