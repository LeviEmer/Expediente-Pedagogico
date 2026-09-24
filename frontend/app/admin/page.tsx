"use client";

import { useEffect, useState } from "react";
import { Building2, CheckCircle2, Plus, Power } from "lucide-react";
import { api, Branch } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { Badge, Button, ConfirmDialog, EmptyState, PageHeader } from "@/components/ui";

export default function AdminPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [newBranchName, setNewBranchName] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<Branch | null>(null);
  const [busyBranchId, setBusyBranchId] = useState<string | null>(null);

  function reload() {
    api.get<Branch[]>("/branches").then(setBranches);
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
    setBusyBranchId(b.id);
    try {
      await api.patch(`/branches/${b.id}`, { active: !b.active });
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al cambiar el estado de la sucursal");
    } finally {
      setBusyBranchId(null);
      setDeactivateTarget(null);
    }
  }

  const editInputClass =
    "rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <PageHeader eyebrow="Administración" title="Sucursales" subtitle="Crea y gestiona las sucursales de la escuela." />

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
                    onClick={() => (b.active ? setDeactivateTarget(b) : toggleBranchActive(b))}
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

        <ConfirmDialog
          open={!!deactivateTarget}
          title="¿Desactivar esta sucursal?"
          description={deactivateTarget && <>Nadie va a poder ver ni gestionar datos de <strong>{deactivateTarget.name}</strong> mientras esté desactivada. La puedes reactivar cuando quieras.</>}
          confirmLabel="Desactivar"
          variant="danger"
          busy={!!deactivateTarget && busyBranchId === deactivateTarget.id}
          onConfirm={() => deactivateTarget && toggleBranchActive(deactivateTarget)}
          onCancel={() => setDeactivateTarget(null)}
        />
      </main>
    </div>
  );
}
