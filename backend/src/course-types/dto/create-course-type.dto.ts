import { IsString } from "class-validator";

export class CreateCourseTypeDto {
  @IsString()
  name: string;
}
