"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, Role } from "./api";

type AuthUser = {
  id: string;
  email: string;
  role: Role;
  instructorId: string | null;
  // null para ADMIN/GENERAL_SUPERVISOR: ven ambas sucursales, no pertenecen a una sola.
  branchId: string | null;
  branchName: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", { email, password });
    localStorage.setItem("token", res.accessToken);
    localStorage.setItem("user", JSON.stringify(res.user));
    setUser(res.user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
