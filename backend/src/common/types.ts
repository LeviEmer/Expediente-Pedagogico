export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: "SUPERVISOR" | "INSTRUCTOR";
  instructorId?: string;
  branchId: string;
};
