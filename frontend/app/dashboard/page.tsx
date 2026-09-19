"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, ClipboardList, PlayCircle, Search, UserRoundSearch, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, Enrollment, EnrollmentSearchResult } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { Badge, EmptyState, LinkButton, LoadingRow, PageHeader, TextField } from "@/components/ui";

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EnrollmentSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reloadMyStudents() {
    if (!user?.instructorId) return;
    setLoading(true);
    api
      .get<Enrollment[]>(`/instructors/${user.instructorId}/enrollments`)
      .then(setEnrollments)
      .finally(() => setLoading(false));
  }

  useEffect(reloadMyStudents, [user]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      api
        .get<EnrollmentSearchResult[]>(`/enrollments/search?q=${encodeURIComponent(query)}`)
        .then(setResults)
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  // El alumno pasó a mi cargo hoy: lo busco por nombre y me lo asigno para
  // poder ver su historial y capturar la clase de hoy.
  async function claim(enrollmentId: string) {
    setClaimingId(enrollmentId);
    setError(null);
    try {
      await api.patch(`/enrollments/${enrollmentId}/claim-instructor`);
      setQuery("");
      setResults([]);
      reloadMyStudents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar el alumno");
    } finally {
      setClaimingId(null);
    }
  }

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <PageHeader
          eyebrow="Hoy"
          title="Tus alumnos activos"
          subtitle="Elige un alumno para ver su historial o capturar la clase de hoy."
        />

        {loading && <LoadingRow label="Cargando tus alumnos..." />}
        {!loading && enrollments.length === 0 && (
          <EmptyState
            icon={Users}
            title="Todavía no tienes alumnos asignados"
            description="Cuando te matriculen un alumno, o si te llega uno de otro instructor, aparecerá aquí."
          />
        )}

        {enrollments.length > 0 && (
          <ul className="mb-10 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {enrollments.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                    {initials(e.student?.firstName, e.student?.lastName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {e.student?.firstName} {e.student?.lastName}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {e.courseType?.name} · {e.transmission} · desde {new Date(e.startDate).toLocaleDateString("es-CR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Link
                    href={`/enrollments/${e.id}/history`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                    Historial
                  </Link>
                  <Link href={`/enrollments/${e.id}/session`}>
                    <LinkButton icon={PlayCircle}>Clase de hoy</LinkButton>
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-800">
            <UserRoundSearch className="h-4 w-4 text-blue-600" aria-hidden="true" />
            ¿Te llegó un alumno que no está en tu lista?
          </h2>
          <p className="mb-3 text-xs text-gray-500">
            Búscalo por nombre y asígnatelo para ver su historial y capturar la clase de hoy.
          </p>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <TextField
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar alumno por nombre..."
              className="pl-9"
            />
          </div>

          {error && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {searching && <p className="mt-3 text-xs text-gray-400">Buscando...</p>}

          {results.length > 0 && (
            <ul className="mt-3 max-w-lg divide-y divide-gray-100 rounded-lg border border-gray-100 text-sm">
              {results.map((r) => {
                const isMine = r.instructor?.id === user?.instructorId;
                return (
                  <li key={r.id} className="flex flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">
                        {r.student.firstName} {r.student.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.courseType.name} · {r.transmission} ·{" "}
                        {r.instructor ? (
                          <span>
                            con {r.instructor.firstName} {r.instructor.lastName}
                          </span>
                        ) : (
                          "sin instructor asignado"
                        )}
                      </p>
                    </div>
                    {isMine ? (
                      <Link href={`/enrollments/${r.id}/session`} className="shrink-0">
                        <Badge tone="green" className="hover:bg-green-100">
                          Ya es tuyo — ir a clase
                        </Badge>
                      </Link>
                    ) : (
                      <button
                        onClick={() => claim(r.id)}
                        disabled={claimingId === r.id}
                        className="shrink-0 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
                      >
                        {claimingId === r.id ? "Asignando..." : "Asignarme este alumno"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
