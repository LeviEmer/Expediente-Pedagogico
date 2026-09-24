"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, KeyRound, Power, Search, UserPlus, Users } from "lucide-react";
import { api, AdminUser, Branch } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { BackLink, Badge, Button, ConfirmDialog, EmptyState, PageHeader, PasswordInput, TextField } from "@/components/ui";

// Contraseña desechable: se asigna por defecto a las cuentas nuevas y a los
// reseteos hechos por el admin — el propio usuario la cambia en su próximo
// login porque `mustChangePassword` queda en true (ver users.service.ts).
const DEFAULT_PASSWORD = "escuelaorellana";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor de sucursal",
  GENERAL_SUPERVISOR: "Supervisor general (solo lectura)",
  INSTRUCTOR: "Instructor",
};

const ROLE_TONE: Record<string, "blue" | "green" | "amber" | "gray"> = {
  ADMIN: "amber",
  SUPERVISOR: "blue",
  GENERAL_SUPERVISOR: "blue",
  INSTRUCTOR: "green",
};

function displayName(u: AdminUser) {
  if (u.instructor) return `${u.instructor.firstName} ${u.instructor.lastName}`;
  return null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [newUser, setNewUser] = useState({
    email: "",
    password: DEFAULT_PASSWORD,
    role: "SUPERVISOR" as "SUPERVISOR" | "GENERAL_SUPERVISOR",
    branchId: "",
  });

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetValue, setResetValue] = useState("");
  const [blockTarget, setBlockTarget] = useState<AdminUser | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  function reload() {
    api.get<AdminUser[]>("/users").then(setUsers);
    api.get<Branch[]>("/branches").then(setBranches);
  }

  useEffect(reload, []);

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users;
    const q = query.trim().toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(q) || displayName(u)?.toLowerCase().includes(q));
  }, [users, query]);

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
      setNewUser({ email: "", password: DEFAULT_PASSWORD, role: "SUPERVISOR", branchId: "" });
      setStatus("Cuenta creada.");
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al crear la cuenta");
    }
  }

  async function toggleUserActive(u: AdminUser) {
    setStatus(null);
    setBusyUserId(u.id);
    try {
      await api.patch(`/users/${u.id}`, { active: !u.active });
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al cambiar el acceso de la cuenta");
    } finally {
      setBusyUserId(null);
      setBlockTarget(null);
    }
  }

  function startReset(u: AdminUser) {
    setResetTargetId(u.id);
    setResetValue(DEFAULT_PASSWORD);
    setStatus(null);
  }

  async function confirmReset(u: AdminUser) {
    if (resetValue.length < 6) {
      setStatus("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    try {
      await api.patch(`/users/${u.id}`, { password: resetValue });
      setStatus(`Contraseña de ${u.email} restablecida a: ${resetValue} (guárdala, no se vuelve a mostrar)`);
      setResetTargetId(null);
      setResetValue("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al restablecer la contraseña");
    }
  }

  const editInputClass =
    "rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <BackLink />
        <PageHeader
          eyebrow="Administración"
          title="Usuarios"
          subtitle="Todas las cuentas con acceso — administradores, supervisores y instructores. Restablece contraseñas y bloquea o desbloquea el acceso desde aquí."
        />

        {status && (
          <p className="flex items-start gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span className="break-words">{status}</span>
          </p>
        )}

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 font-medium text-gray-800">
            <UserPlus className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Crear supervisor o supervisor general
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            Los instructores no se crean aquí — cada supervisor los da de alta desde su Panel supervisor. La
            contraseña queda por defecto en <span className="font-mono">{DEFAULT_PASSWORD}</span>; al usuario se le
            pedirá cambiarla en su primer inicio de sesión.
          </p>
          <form onSubmit={createUser} className="flex flex-wrap gap-2">
            <input
              placeholder="Correo"
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser((s) => ({ ...s, email: e.target.value }))}
              className={editInputClass}
            />
            <PasswordInput
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
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 font-medium text-gray-800">
            <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Todas las cuentas ({users.length})
          </h2>

          <div className="relative mb-3 max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <TextField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por correo o nombre..." className="pl-9" />
          </div>

          {filteredUsers.length === 0 ? (
            <EmptyState icon={Users} title="No hay cuentas que coincidan" />
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 text-sm">
              {filteredUsers.map((u) => (
                <li key={u.id} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-medium text-gray-900">{displayName(u) ?? u.email}</span>
                      {displayName(u) && <span className="text-xs text-gray-400">{u.email}</span>}
                      <Badge tone={ROLE_TONE[u.role] ?? "gray"}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      {u.branch && <Badge tone="gray">{u.branch.name}</Badge>}
                      {!u.active && <Badge tone="red">Bloqueado</Badge>}
                    </div>
                    {u.role !== "ADMIN" && (
                      <div className="flex shrink-0 gap-1">
                        <button
                          onClick={() => (resetTargetId === u.id ? setResetTargetId(null) : startReset(u))}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-blue-700"
                        >
                          <KeyRound className="h-3.5 w-3.5" aria-hidden="true" />
                          Resetear contraseña
                        </button>
                        <button
                          onClick={() => (u.active ? setBlockTarget(u) : toggleUserActive(u))}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                        >
                          <Power className="h-3.5 w-3.5" aria-hidden="true" />
                          {u.active ? "Bloquear acceso" : "Desbloquear"}
                        </button>
                      </div>
                    )}
                  </div>

                  {resetTargetId === u.id && (
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 p-2.5">
                      <PasswordInput
                        value={resetValue}
                        onChange={(e) => setResetValue(e.target.value)}
                        className={editInputClass}
                        placeholder="Nueva contraseña"
                      />
                      <button
                        type="button"
                        onClick={() => setResetValue(DEFAULT_PASSWORD)}
                        className="text-xs font-medium text-blue-700 hover:underline"
                      >
                        Usar contraseña por defecto
                      </button>
                      <Button variant="primary" onClick={() => confirmReset(u)} className="ml-auto">
                        Guardar nueva contraseña
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <ConfirmDialog
          open={!!blockTarget}
          title="¿Bloquear el acceso de esta cuenta?"
          description={blockTarget && <><strong>{displayName(blockTarget) ?? blockTarget.email}</strong> ya no va a poder iniciar sesión hasta que la desbloquees. No se borra ningún dato.</>}
          confirmLabel="Bloquear"
          variant="danger"
          busy={!!blockTarget && busyUserId === blockTarget.id}
          onConfirm={() => blockTarget && toggleUserActive(blockTarget)}
          onCancel={() => setBlockTarget(null)}
        />
      </main>
    </div>
  );
}
