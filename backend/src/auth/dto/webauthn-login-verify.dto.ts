import { IsEmail, IsObject } from "class-validator";

export class WebAuthnLoginVerifyDto {
  @IsEmail()
  email: string;

  @IsObject()
  response: object;
}
