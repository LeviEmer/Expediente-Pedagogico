"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Plus, Power, UserPlus, Users } from "lucide-react";
import { api, AdminUser, Branch } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { Badge, Button, EmptyState, PageHeader } from "@/components/ui";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor de sucursal",
  GENERAL_SUPERVISOR: "Supervisor general (solo lectura)",
};

export default function AdminPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const [newBranchName, setNewBranchName] = useState("");

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    role: "SUPERVISOR" as "SUPERVISOR" | "GENERAL_SUPERVISOR",
    branchId: "",
  });

  function reload() {
    api.get<Branch[]>("/branches").then(setBranches);
    api.get<AdminUser[]>("/users").then(setUsers);
  }

  useEffect(reload, []);

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post("/branches", { name: newBranchName });
      setNewBranchName("");
      setStatus("Sucursal creada.");
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al crear la sucursal");
    }
  }

  async function toggleBranchActive(b: Branch) {
    setStatus(null);
    try {
      await api.patch(`/branches/${b.id}`, { active: !b.active });
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al cambiar el estado de la sucursal");
    }
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (newUser.role === "SUPERVISOR" && !newUser.branchId) {
      setStatus("Elige la sucursal del supervisor.");
      return;
    }
    try {
      await api.post("/users", {
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        branchId: newUser.role === "SUPERVISOR" ? newUser.branchId : undefined,
      });
      setNewUser({ email: "", password: "", role: "SUPERVISOR", branchId: "" });
      setStatus("Usuario creado.");
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al crear el usuario");
    }
  }

  async function toggleUserActive(u: AdminUser) {
    setStatus(null);
    try {
      await api.patch(`/users/${u.id}`, { active: !u.active });
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al cambiar el estado del usuario");
    }
  }

  const editInputClass =
    "rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <PageHeader eyebrow="Administración" title="Sucursales y cuentas de acceso" />

        {status && (
          <p className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {status}
          </p>
        )}

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 font-medium text-gray-800">
            <Building2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Sucursales
          </h2>
          <form onSubmit={createBranch} className="mb-4 flex flex-wrap gap-2">
            <input
              placeholder="Nombre de la sucursal"
              required
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              className={editInputClass}
            />
            <Button type="submit" icon={Plus}>
              Agregar
            </Button>
          </form>

          {branches.length === 0 ? (
            <EmptyState icon={Building2} title="No hay sucursales todavía" />
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 text-sm">
              {branches.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="flex items-center gap-2">
                    {b.name}
                    {!b.active && <Badge tone="gray">Inactiva</Badge>}
                  </span>
                  <button
                    onClick={() => toggleBranchActive(b)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    <Power className="h-3.5 w-3.5" aria-hidden="true" />
                    {b.active ? "Desactivar" : "Reactivar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 font-medium text-gray-800">
            <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Supervisores y supervisor general
          </h2>
          <form onSubmit={createUser} className="mb-4 flex flex-wrap gap-2">
            <input
              placeholder="Correo"
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
              className={editInputClass}
            />
            <input
              placeholder="Contraseña"
              required
              minLength={6}
              value={newUser.password}
              onChange={(e) => setNewUser((s) => ({ ...s, password: e.target.value }))}
              className={editInputClass}
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((s) => ({ ...s, role: e.target.value as typeof s.role }))}
              className={editInputClass}
            >
              <option value="SUPERVISOR">Supervisor de sucursal</option>
              <option value="GENERAL_SUPERVISOR">Supervisor general (solo lectura)</option>
            </select>
            {newUser.role === "SUPERVISOR" && (
              <select
                required
                value={newUser.branchId}
                onChange={(e) => setNewUser((s) => ({ ...s, branchId: e.target.value }))}
                className={editInputClass}
              >
                <option value="" disabled>
                  Sucursal...
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
            <Button type="submit" icon={UserPlus}>
              Crear cuenta
            </Button>
          </form>

          {users.length === 0 ? (
            <EmptyState icon={Users} title="No hay cuentas todavía" />
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 text-sm">
              {users.map((u) => (
                <li key={u.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span>{u.email}</span>
                    <Badge tone="blue">{ROLE_LABEL[u.role] ?? u.role}</Badge>
                    {u.branch && <Badge tone="gray">{u.branch.name}</Badge>}
                    {!u.active && <Badge tone="gray">Inactivo</Badge>}
                  </div>
                  {u.role !== "ADMIN" && (
                    <button
                      onClick={() => toggleUserActive(u)}
                      className="inline-flex items-center gap-1 self-start rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 sm:self-auto"
                    >
                      <Power className="h-3.5 w-3.5" aria-hidden="true" />
                      {u.active ? "Desactivar" : "Reactivar"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
