import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from "class-validator";

class GeneralEvaluationScoreDto {
  @IsUUID()
  dimensionId: string;

  @IsInt()
  @Min(1)
  @Max(4)
  level: number;
}

export class UpdateGeneralEvaluationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeneralEvaluationScoreDto)
  scores: GeneralEvaluationScoreDto[];

  @IsOptional()
  @IsString()
  personalObservations?: string;
}
