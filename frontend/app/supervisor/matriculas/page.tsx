"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClipboardList, Search, UserPlus } from "lucide-react";
import { api, Enrollment, Instructor } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { BackLink, Badge, ConfirmDialog, EmptyState, PageHeader, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

function matches(query: string, ...fields: (string | undefined | null)[]) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

function initials(a?: string, b?: string) {
  return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase();
}

export default function MatriculasPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isReadOnly = user?.role === "GENERAL_SUPERVISOR";
  const showBranchColumn = isAdmin || isReadOnly;

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showFinished, setShowFinished] = useState(false);
  const [reassignTarget, setReassignTarget] = useState<{ enrollment: Enrollment; instructor: Instructor } | null>(null);
  const [reassigning, setReassigning] = useState(false);

  function reload() {
    api.get<Enrollment[]>("/enrollments").then(setEnrollments);
    api.get<Instructor[]>("/instructors").then(setInstructors);
  }

  useEffect(reload, []);

  const finishedCount = enrollments.filter((e) => e.status !== "ACTIVO").length;

  const filteredEnrollments = useMemo(
    () =>
      enrollments
        .filter((e) => showFinished || e.status === "ACTIVO")
        .filter((e) =>
          matches(query, e.student?.firstName, e.student?.lastName, e.courseType?.name, e.instructor?.firstName, e.instructor?.lastName),
        ),
    [enrollments, query, showFinished],
  );

  async function confirmReassign() {
    if (!reassignTarget) return;
    setStatus(null);
    setReassigning(true);
    try {
      await api.patch(`/enrollments/${reassignTarget.enrollment.id}/claim-instructor`, { instructorId: reassignTarget.instructor.id });
      setStatus("Instructor reasignado.");
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al reasignar instructor");
    } finally {
      setReassigning(false);
      setReassignTarget(null);
    }
  }

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
        <BackLink />
        <PageHeader
          eyebrow={isReadOnly ? "Solo lectura" : "Panel de supervisor"}
          title="Matrículas"
          subtitle={`${enrollments.length} en total · ${enrollments.filter((e) => e.status === "ACTIVO").length} activas`}
          actions={
            !isReadOnly && (
              <Link
                href="/enrollments/new"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-600/20 hover:bg-blue-700"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Nueva matrícula
              </Link>
            )
          }
        />

        {status && (
          <p className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">{status}</p>
        )}

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div className="relative max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
              <TextField value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por alumno, curso o instructor..." className="pl-9" />
            </div>
            {finishedCount > 0 && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={showFinished}
                  onChange={(e) => setShowFinished(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                />
                Mostrar {finishedCount} finalizada{finishedCount === 1 ? "" : "s"}/cancelada{finishedCount === 1 ? "" : "s"}
              </label>
            )}
          </div>

          {filteredEnrollments.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No hay matrículas que coincidan" />
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 text-sm">
              {filteredEnrollments.map((e) => (
                <li key={e.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                      {initials(e.student?.firstName, e.student?.lastName)}
                    </span>
                    <span className="break-words">
                      {e.student?.firstName} {e.student?.lastName} — {e.courseType?.name} · {e.transmission}
                    </span>
                    <Badge tone={e.status === "ACTIVO" ? "green" : e.status === "FINALIZADO" ? "blue" : "gray"}>{e.status}</Badge>
                    {showBranchColumn && e.branch && <Badge tone="gray">{e.branch.name}</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!isReadOnly && (
                      <select
                        value={e.instructor?.id ?? ""}
                        onChange={(ev) => {
                          const instructor = instructors.find((i) => i.id === ev.target.value);
                          if (instructor) setReassignTarget({ enrollment: e, instructor });
                        }}
                        className="rounded-lg border border-gray-200 px-2 py-1 text-xs focus:border-blue-400 focus:outline-none"
                      >
                        <option value="" disabled>
                          Sin instructor
                        </option>
                        {instructors
                          .filter((i) => i.active !== false && (!e.branchId || i.branchId === e.branchId))
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.firstName} {i.lastName}
                            </option>
                          ))}
                      </select>
                    )}
                    <Link href={`/enrollments/${e.id}/history`} className="text-xs font-medium text-blue-700 hover:underline">
                      Ver historial y clases
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={!!reassignTarget}
        title="¿Reasignar el instructor?"
        description={
          reassignTarget && (
            <>
              <strong>{reassignTarget.enrollment.student?.firstName} {reassignTarget.enrollment.student?.lastName}</strong> queda
              a cargo de <strong>{reassignTarget.instructor.firstName} {reassignTarget.instructor.lastName}</strong>.
            </>
          )
        }
        confirmLabel="Reasignar"
        busy={reassigning}
        onConfirm={confirmReassign}
        onCancel={() => setReassignTarget(null)}
      />
    </div>
  );
}
