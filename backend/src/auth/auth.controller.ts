import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/server";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { AuthenticatedUser } from "../common/types";
import { AuthService } from "./auth.service";
import { WebauthnService } from "./webauthn.service";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { WebAuthnRegisterVerifyDto } from "./dto/webauthn-register-verify.dto";
import { WebAuthnLoginOptionsDto } from "./dto/webauthn-login-options.dto";
import { WebAuthnLoginVerifyDto } from "./dto/webauthn-login-verify.dto";

@Controller("auth")
export class AuthController {
  constructor(
    private authService: AuthService,
    private webauthn: WebauthnService,
  ) {}

  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post("change-password")
  @UseGuards(JwtAuthGuard)
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // Face ID / huella (passkeys) — alterno a la contraseña, se activa desde
  // una sesión ya iniciada (por eso estos dos llevan JWT) y luego sirve
  // para entrar sin contraseña la próxima vez (los otros dos, públicos).
  @Post("webauthn/register-options")
  @UseGuards(JwtAuthGuard)
  webauthnRegisterOptions(@CurrentUser() user: AuthenticatedUser) {
    return this.webauthn.registerOptions(user.userId, user.email);
  }

  @Post("webauthn/register-verify")
  @UseGuards(JwtAuthGuard)
  webauthnRegisterVerify(@CurrentUser() user: AuthenticatedUser, @Body() dto: WebAuthnRegisterVerifyDto) {
    return this.webauthn.registerVerify(user.userId, dto.response as RegistrationResponseJSON, dto.deviceLabel);
  }

  @Post("webauthn/login-options")
  webauthnLoginOptions(@Body() dto: WebAuthnLoginOptionsDto) {
    return this.webauthn.loginOptions(dto.email);
  }

  @Post("webauthn/login-verify")
  webauthnLoginVerify(@Body() dto: WebAuthnLoginVerifyDto) {
    return this.webauthn.loginVerify(dto.email, dto.response as AuthenticationResponseJSON);
  }

  @Get("webauthn/credentials")
  @UseGuards(JwtAuthGuard)
  webauthnListCredentials(@CurrentUser() user: AuthenticatedUser) {
    return this.webauthn.listCredentials(user.userId);
  }

  @Delete("webauthn/credentials/:id")
  @UseGuards(JwtAuthGuard)
  webauthnRemoveCredential(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.webauthn.removeCredential(user.userId, id);
  }
}
