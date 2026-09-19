import { IsBoolean, IsOptional, IsString, MinLength } from "class-validator";

export class UpdateBranchDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
