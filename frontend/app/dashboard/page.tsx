"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, Enrollment, EnrollmentSearchResult } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

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
    <div>
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-4 text-lg font-semibold">Alumnos activos</h1>

        {loading && <p className="text-sm text-gray-500">Cargando...</p>}
        {!loading && enrollments.length === 0 && (
          <p className="mb-6 text-sm text-gray-500">No tienes alumnos activos asignados todavía.</p>
        )}

        <ul className="mb-8 divide-y rounded border bg-white">
          {enrollments.map((e) => (
            <li key={e.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="font-medium">
                  {e.student?.firstName} {e.student?.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {e.courseType?.name} · {e.transmission} · inicio {new Date(e.startDate).toLocaleDateString("es-CR")}
                </p>
              </div>
              <div className="flex gap-3 text-sm">
                <Link href={`/enrollments/${e.id}/history`} className="text-blue-700 hover:underline">
                  Historial
                </Link>
                <Link
                  href={`/enrollments/${e.id}/session`}
                  className="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                >
                  Clase de hoy
                </Link>
              </div>
            </li>
          ))}
        </ul>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-gray-700">¿Te llegó un alumno que no está en tu lista?</h2>
          <p className="mb-3 text-xs text-gray-500">
            Búscalo por nombre y asígnatelo para ver su historial y capturar la clase de hoy.
          </p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar alumno por nombre..."
            className="mb-3 w-full max-w-sm rounded border px-3 py-2 text-sm"
          />

          {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {searching && <p className="text-xs text-gray-400">Buscando...</p>}

          {results.length > 0 && (
            <ul className="max-w-lg divide-y rounded border bg-white text-sm">
              {results.map((r) => {
                const isMine = r.instructor?.id === user?.instructorId;
                return (
                  <li key={r.id} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <p className="font-medium">
                        {r.student.firstName} {r.student.lastName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {r.courseType.name} · {r.transmission} ·{" "}
                        {r.instructor ? `con ${r.instructor.firstName} ${r.instructor.lastName}` : "sin instructor asignado"}
                      </p>
                    </div>
                    {isMine ? (
                      <Link href={`/enrollments/${r.id}/session`} className="text-blue-700 hover:underline">
                        Ya es mío — ir a clase
                      </Link>
                    ) : (
                      <button
                        onClick={() => claim(r.id)}
                        disabled={claimingId === r.id}
                        className="rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50"
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
