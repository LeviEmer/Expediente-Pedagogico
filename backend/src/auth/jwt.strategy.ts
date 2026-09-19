import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import { Role } from "../common/types";

export type JwtPayload = {
  sub: string;
  email: string;
  role: Role;
  instructorId?: string;
  branchId: string | null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? "dev-secret-change-me",
    });
  }

  async validate(payload: JwtPayload) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      instructorId: payload.instructorId,
      branchId: payload.branchId,
    };
  }
}
