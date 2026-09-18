import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PassportModule,
    // registerAsync (en vez de register) para que el secreto se lea recién
    // cuando Nest instancia el módulo, no cuando este archivo se importa —
    // en ese momento ConfigModule.forRoot() ya cargó el .env. Con register()
    // directo, process.env.JWT_SECRET aún no existía y el token se firmaba
    // con el secreto de respaldo, distinto al que usa JwtStrategy al validar.
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET ?? "dev-secret-change-me",
        signOptions: { expiresIn: "12h" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
