export type Role = "ADMIN" | "SUPERVISOR" | "GENERAL_SUPERVISOR" | "INSTRUCTOR";

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: Role;
  instructorId?: string;
  // null para ADMIN/GENERAL_SUPERVISOR (ven ambas sucursales, no pertenecen a una sola).
  branchId: string | null;
};
