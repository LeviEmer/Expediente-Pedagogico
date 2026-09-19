-- Contraseña temporal obligatoria de cambiar + "olvidé mi contraseña" por correo.
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "passwordResetTokenHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
