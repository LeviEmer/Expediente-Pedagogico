import { IsObject, IsOptional, IsString, MaxLength } from "class-validator";

export class WebAuthnRegisterVerifyDto {
  @IsObject()
  response: object;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceLabel?: string;
}
