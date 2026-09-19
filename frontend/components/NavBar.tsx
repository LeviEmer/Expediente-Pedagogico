"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, GraduationCap, LayoutDashboard, LogOut, Shield, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cx } from "@/components/ui";

function NavLink({ href, icon: Icon, active, children }: { href: string; icon: typeof Users; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

export function NavBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-gray-900">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
            <GraduationCap className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="leading-tight">
            <span className="block whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-blue-600">
              Escuela de Manejo Orellana
            </span>
            <span className="block whitespace-nowrap font-semibold">Expediente Pedagógico</span>
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {user?.role === "INSTRUCTOR" && (
            <>
              <NavLink href="/dashboard" icon={Users} active={pathname === "/dashboard"}>
                Mis alumnos
              </NavLink>
              <NavLink href="/enrollments/new" icon={UserPlus} active={pathname === "/enrollments/new"}>
                Nueva matrícula
              </NavLink>
            </>
          )}
          {(user?.role === "SUPERVISOR" || user?.role === "GENERAL_SUPERVISOR") && (
            <NavLink href="/supervisor" icon={LayoutDashboard} active={pathname === "/supervisor"}>
              {user.role === "GENERAL_SUPERVISOR" ? "Panel general (solo lectura)" : "Panel supervisor"}
            </NavLink>
          )}
          {user?.role === "ADMIN" && (
            <>
              <NavLink href="/admin" icon={Shield} active={pathname === "/admin"}>
                Administración
              </NavLink>
              <NavLink href="/supervisor" icon={LayoutDashboard} active={pathname === "/supervisor"}>
                Panel supervisor
              </NavLink>
            </>
          )}
          {user?.branchName ? (
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-medium text-gray-600">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {user.branchName}
            </span>
          ) : (
            user && (user.role === "ADMIN" || user.role === "GENERAL_SUPERVISOR") && (
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-gray-100 px-2.5 py-1.5 text-sm font-medium text-gray-600">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                Todas las sucursales
              </span>
            )
          )}
          {user && (
            <button
              onClick={logout}
              className="ml-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">{user.email}</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
