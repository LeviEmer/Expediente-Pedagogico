import { IsObject, IsString } from "class-validator";

export class WebAuthnLoginVerifyDto {
  @IsString()
  flowId: string;

  @IsObject()
  response: object;
}
