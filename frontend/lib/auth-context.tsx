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
  // true justo después de crear la cuenta o de un reseteo hecho por otra
  // persona — la pantalla raíz manda a /change-password hasta que se ponga en false.
  mustChangePassword: boolean;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  applySession: (accessToken: string, user: AuthUser) => AuthUser;
  logout: () => void;
  markPasswordChanged: () => void;
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

  function applySession(accessToken: string, sessionUser: AuthUser) {
    localStorage.setItem("token", accessToken);
    localStorage.setItem("user", JSON.stringify(sessionUser));
    setUser(sessionUser);
    return sessionUser;
  }

  async function login(email: string, password: string) {
    const res = await api.post<{ accessToken: string; user: AuthUser }>("/auth/login", { email, password });
    return applySession(res.accessToken, res.user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  }

  function markPasswordChanged() {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, mustChangePassword: false };
      localStorage.setItem("user", JSON.stringify(next));
      return next;
    });
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, applySession, logout, markPasswordChanged }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
