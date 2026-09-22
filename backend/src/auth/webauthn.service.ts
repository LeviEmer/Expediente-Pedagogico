import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { PrismaService } from "../prisma/prisma.service";
import { SCHOOL_NAME } from "../mail/templates";

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutos — tiempo de sobra para completar Face ID/huella

function rpConfig() {
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  return { rpID: new URL(frontendUrl).hostname, origin: frontendUrl };
}

// Passkeys (Face ID / huella) son un método ALTERNO al login con
// contraseña, no lo reemplazan — la persona elige cuál usar cada vez. Los
// "challenges" viven en memoria porque Render corre una sola instancia y
// el reto solo vive unos minutos entre pedir las opciones y confirmarlas;
// no hay ningún dato biométrico aquí, solo la llave pública que genera el
// propio dispositivo.
@Injectable()
export class WebauthnService {
  private registerChallenges = new Map<string, { challenge: string; expiresAt: number }>();
  private loginChallenges = new Map<string, { challenge: string; expiresAt: number }>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  private setChallenge(store: Map<string, { challenge: string; expiresAt: number }>, key: string, challenge: string) {
    store.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
  }

  private takeChallenge(store: Map<string, { challenge: string; expiresAt: number }>, key: string): string {
    const entry = store.get(key);
    store.delete(key);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new BadRequestException("La solicitud venció, intenta de nuevo");
    }
    return entry.challenge;
  }

  async registerOptions(userId: string, email: string) {
    const { rpID } = rpConfig();
    const existing = await this.prisma.webAuthnCredential.findMany({ where: { userId } });
    const options = await generateRegistrationOptions({
      rpName: SCHOOL_NAME,
      rpID,
      userName: email,
      attestationType: "none",
      excludeCredentials: existing.map((c) => ({
        id: c.credentialId,
        transports: c.transports ? (JSON.parse(c.transports) as string[]) : undefined,
      })),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });
    this.setChallenge(this.registerChallenges, userId, options.challenge);
    return options;
  }

  async registerVerify(userId: string, response: RegistrationResponseJSON, deviceLabel?: string) {
    const { rpID, origin } = rpConfig();
    const expectedChallenge = this.takeChallenge(this.registerChallenges, userId);

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException("No se pudo verificar el dispositivo");
    }

    const { credential } = verification.registrationInfo;
    await this.prisma.webAuthnCredential.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        transports: credential.transports ? JSON.stringify(credential.transports) : null,
        deviceLabel: deviceLabel ?? null,
      },
    });
    return { ok: true };
  }

  async loginOptions(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email }, include: { webAuthnCredentials: true } });
    // Mismo mensaje exista o no la cuenta / tenga o no huella registrada —
    // no revelar información por esta vía, igual que "olvidé mi contraseña".
    if (!user || !user.active || user.webAuthnCredentials.length === 0) {
      throw new BadRequestException("No hay Face ID/huella configurada para esta cuenta en este correo");
    }
    const { rpID } = rpConfig();
    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: user.webAuthnCredentials.map((c) => ({
        id: c.credentialId,
        transports: c.transports ? (JSON.parse(c.transports) as string[]) : undefined,
      })),
      userVerification: "preferred",
    });
    this.setChallenge(this.loginChallenges, email, options.challenge);
    return options;
  }

  async loginVerify(email: string, response: AuthenticationResponseJSON) {
    const { rpID, origin } = rpConfig();
    const expectedChallenge = this.takeChallenge(this.loginChallenges, email);

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { webAuthnCredentials: true, instructor: true, branch: true },
    });
    if (!user || !user.active) throw new UnauthorizedException("Credenciales inválidas");

    const stored = user.webAuthnCredentials.find((c) => c.credentialId === response.id);
    if (!stored) throw new UnauthorizedException("Este dispositivo no está registrado para esta cuenta");

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: stored.credentialId,
        publicKey: new Uint8Array(stored.publicKey),
        counter: Number(stored.counter),
        transports: stored.transports ? (JSON.parse(stored.transports) as string[]) : undefined,
      },
    });
    if (!verification.verified) throw new UnauthorizedException("No se pudo verificar Face ID/huella");

    await this.prisma.webAuthnCredential.update({
      where: { id: stored.id },
      data: { counter: BigInt(verification.authenticationInfo.newCounter) },
    });

    const branchId = user.branchId ?? user.instructor?.branchId ?? null;
    const payload = { sub: user.id, email: user.email, role: user.role, instructorId: user.instructor?.id, branchId };
    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        instructorId: user.instructor?.id ?? null,
        branchId,
        branchName: user.branch?.name ?? null,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async listCredentials(userId: string) {
    const credentials = await this.prisma.webAuthnCredential.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return credentials.map((c) => ({ id: c.id, deviceLabel: c.deviceLabel, createdAt: c.createdAt }));
  }

  async removeCredential(userId: string, credentialId: string) {
    const credential = await this.prisma.webAuthnCredential.findUnique({ where: { id: credentialId } });
    if (!credential || credential.userId !== userId) {
      throw new BadRequestException("Ese dispositivo no existe o no te pertenece");
    }
    await this.prisma.webAuthnCredential.delete({ where: { id: credentialId } });
    return { ok: true };
  }
}
