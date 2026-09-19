import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { AuthenticatedUser } from "./types";

// ADMIN y GENERAL_SUPERVISOR no pertenecen a una sola sucursal: ven ambas.
export function hasGlobalAccess(user: AuthenticatedUser): boolean {
  return user.role === "ADMIN" || user.role === "GENERAL_SUPERVISOR";
}

// Resuelve a qué sucursal pertenece algo que se está creando. El ADMIN no
// tiene sucursal propia, así que debe indicarla explícitamente; todos los
// demás roles usan la suya (ignora cualquier branchId que manden en el body).
export function resolveBranchId(user: AuthenticatedUser, requestedBranchId?: string): string {
  if (user.role === "ADMIN") {
    if (!requestedBranchId) throw new BadRequestException("Debes indicar la sucursal");
    return requestedBranchId;
  }
  if (!user.branchId) throw new ForbiddenException("Tu usuario no tiene sucursal asignada");
  return user.branchId;
}

// Aislamiento entre sucursales: bloquea el cruce salvo para quien tiene
// acceso global (ADMIN, GENERAL_SUPERVISOR).
export function assertSameBranch(user: AuthenticatedUser, branchId: string, message: string) {
  if (hasGlobalAccess(user)) return;
  if (user.branchId !== branchId) {
    throw new ForbiddenException(message);
  }
}
