"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="h-2 w-2 rounded-full bg-blue-600" aria-hidden="true" />
          Expediente Pedagógico
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {user?.role === "INSTRUCTOR" && (
            <>
              <Link href="/dashboard" className="text-gray-700 hover:text-blue-700">
                Mis alumnos
              </Link>
              <Link href="/enrollments/new" className="text-gray-700 hover:text-blue-700">
                Nueva matrícula
              </Link>
            </>
          )}
          {user?.role === "SUPERVISOR" && (
            <Link href="/supervisor" className="text-gray-700 hover:text-blue-700">
              Panel supervisor
            </Link>
          )}
          {user && (
            <button onClick={logout} className="text-gray-400 hover:text-gray-600">
              Salir ({user.email})
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
