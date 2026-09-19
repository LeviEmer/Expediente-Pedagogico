"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Building2, ClipboardList, LayoutDashboard, LogOut, LucideIcon, UserCog, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cx } from "@/components/ui";

// Ancho del panel lateral en escritorio — SidebarShell.tsx usa el mismo
// valor (md:pl-60) para correr el contenido de cada página.
export const SIDEBAR_WIDTH_CLASS = "md:w-60";

type NavItem = { href: string; icon: LucideIcon; label: string };

function useNavItems(): NavItem[] {
  const { user } = useAuth();
  const items: NavItem[] = [];

  if (user?.role === "INSTRUCTOR") {
    items.push({ href: "/dashboard", icon: Users, label: "Mis alumnos" });
    items.push({ href: "/enrollments/new", icon: UserPlus, label: "Nueva matrícula" });
  }
  if (user?.role === "SUPERVISOR" || user?.role === "GENERAL_SUPERVISOR") {
    items.push({
      href: "/supervisor",
      icon: LayoutDashboard,
      label: user.role === "GENERAL_SUPERVISOR" ? "Panel general (solo lectura)" : "Panel supervisor",
    });
    items.push({ href: "/supervisor/matriculas", icon: ClipboardList, label: "Matrículas" });
  }
  if (user?.role === "ADMIN") {
    items.push({ href: "/admin", icon: Building2, label: "Sucursales" });
    items.push({ href: "/admin/users", icon: UserCog, label: "Usuarios" });
    items.push({ href: "/supervisor", icon: LayoutDashboard, label: "Panel supervisor" });
    items.push({ href: "/supervisor/matriculas", icon: ClipboardList, label: "Matrículas" });
  }
  return items;
}

function Brand({ light }: { light?: boolean }) {
  return (
    <Link href="/" className={cx("flex items-center gap-2", light ? "text-white" : "text-gray-900")}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-gray-200">
        <Image src="/logo.jpg" alt="" width={36} height={36} className="h-full w-full object-cover" priority />
      </span>
      <span className="leading-tight">
        <span
          className={cx(
            "block whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide",
            light ? "text-blue-100" : "text-blue-600",
          )}
        >
          Escuela de Manejo Orellana
        </span>
        <span className="block whitespace-nowrap font-semibold">Expediente Pedagógico</span>
      </span>
    </Link>
  );
}

function BranchBadge({ light }: { light?: boolean }) {
  const { user } = useAuth();
  if (!user) return null;
  const label = user.branchName ?? ((user.role === "ADMIN" || user.role === "GENERAL_SUPERVISOR") ? "Todas las sucursales" : null);
  if (!label) return null;
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium",
        light ? "bg-white/10 text-blue-50" : "bg-gray-100 text-gray-600",
      )}
    >
      <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}

// ---------- Barra superior (celular y tablet) ----------

function TopNavLink({ href, icon: Icon, active, children }: { href: string; icon: LucideIcon; active: boolean; children: React.ReactNode }) {
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

function TopBar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
        <Brand />
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {items.map((item) => (
            <TopNavLink key={item.href + item.label} href={item.href} icon={item.icon} active={pathname === item.href}>
              {item.label}
            </TopNavLink>
          ))}
          <BranchBadge />
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

// ---------- Panel lateral (escritorio) ----------

function SideNavLink({ href, icon: Icon, active, children }: { href: string; icon: LucideIcon; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-white text-blue-700" : "text-blue-50 hover:bg-white/10",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </Link>
  );
}

function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const items = useNavItems();

  return (
    <aside className={cx("fixed inset-y-0 left-0 z-10 hidden flex-col gap-6 bg-blue-600 p-4 md:flex", SIDEBAR_WIDTH_CLASS)}>
      <Brand light />
      <nav className="flex flex-1 flex-col gap-1">
        {items.map((item) => (
          <SideNavLink key={item.href + item.label} href={item.href} icon={item.icon} active={pathname === item.href}>
            {item.label}
          </SideNavLink>
        ))}
      </nav>
      <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
        <BranchBadge light />
        {user && (
          <button
            onClick={logout}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-blue-100 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="truncate">{user.email}</span>
          </button>
        )}
      </div>
    </aside>
  );
}

export function NavBar() {
  return (
    <>
      <TopBar />
      <Sidebar />
    </>
  );
}
