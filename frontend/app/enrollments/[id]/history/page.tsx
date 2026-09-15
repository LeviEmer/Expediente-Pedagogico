"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ClassSessionSummary, CriterionRating, Enrollment, EnrollmentLessonProgress } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

const RATING_LABEL: Record<CriterionRating, string> = { NO: "No", MEDIO: "Medio", SI: "Sí", NA: "No aplica" };
const RATING_DOT: Record<CriterionRating, string> = {
  NO: "bg-red-500",
  MEDIO: "bg-amber-500",
  SI: "bg-green-500",
  NA: "bg-gray-300",
};

export default function EnrollmentHistoryPage() {
  const { id: enrollmentId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<EnrollmentLessonProgress[]>([]);
  const [sessions, setSessions] = useState<ClassSessionSummary[]>([]);
  const [view, setView] = useState<"estado" | "clases">("estado");
  const [busySessionId, setBusySessionId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function reload() {
    if (!enrollmentId) return;
    api.get<Enrollment>(`/enrollments/${enrollmentId}`).then(setEnrollment);
    api.get<EnrollmentLessonProgress[]>(`/enrollments/${enrollmentId}/progress`).then(setProgress);
    api.get<ClassSessionSummary[]>(`/enrollments/${enrollmentId}/class-sessions`).then(setSessions);
  }

  useEffect(reload, [enrollmentId]);

  const completedCount = progress.filter((p) => p.completedOn).length;

  async function resendSessionReport(sessionId: string) {
    setBusySessionId(sessionId);
    setNotice(null);
    try {
      const res = await api.post<{ sent: boolean }>(`/class-sessions/${sessionId}/resend-report`);
      setNotice(res.sent ? "Correo reenviado." : "El reenvío falló otra vez — revisa la configuración de correo.");
      reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error al reenviar el correo");
    } finally {
      setBusySessionId(null);
    }
  }

  async function reopenSession(sessionId: string) {
    if (!window.confirm("¿Reabrir esta sesión cerrada para editarla?")) return;
    setBusySessionId(sessionId);
    setNotice(null);
    try {
      await api.patch(`/class-sessions/${sessionId}/reopen`);
      setNotice("Sesión reabierta.");
      reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error al reabrir la sesión");
    } finally {
      setBusySessionId(null);
    }
  }

  async function resendFinalReport() {
    setNotice(null);
    try {
      const res = await api.post<{ sent: boolean }>(`/enrollments/${enrollmentId}/resend-final-report`);
      setNotice(res.sent ? "Reporte final reenviado." : "El reenvío falló otra vez — revisa la configuración de correo.");
      reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error al reenviar el reporte final");
    }
  }

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Historial del alumno</h1>
            {enrollment?.student && (
              <p className="text-sm text-gray-500">
                {enrollment.student.firstName} {enrollment.student.lastName} · {enrollment.courseType?.name} ·{" "}
                estado: {enrollment.status}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link href={`/enrollments/${enrollmentId}/evaluation`} className="rounded border px-3 py-2 text-sm">
              Evaluación general / cierre de curso
            </Link>
            {user?.role === "INSTRUCTOR" && (
              <Link
                href={`/enrollments/${enrollmentId}/session`}
                className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
              >
                Clase de hoy
              </Link>
            )}
          </div>
        </div>

        {notice && <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">{notice}</p>}

        {user?.role === "SUPERVISOR" && enrollment?.status === "FINALIZADO" && (
          <div
            className={`mb-4 flex items-center justify-between rounded border px-3 py-2 text-sm ${
              enrollment.finalReportSentAt ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            <span>
              {enrollment.finalReportSentAt
                ? `Reporte final enviado (${new Date(enrollment.finalReportSentAt).toLocaleString("es-CR")})`
                : "El reporte final no se pudo enviar."}
            </span>
            <button onClick={resendFinalReport} className="font-medium underline">
              Reenviar
            </button>
          </div>
        )}

        <div className="mb-4 flex gap-2 text-sm">
          <button
            onClick={() => setView("estado")}
            className={`rounded-full border px-3 py-1 ${
              view === "estado" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            Estado actual ({progress.length} lecciones)
          </button>
          <button
            onClick={() => setView("clases")}
            className={`rounded-full border px-3 py-1 ${
              view === "clases" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            Clases por día ({sessions.length})
          </button>
        </div>

        {view === "estado" && (
          <>
            <p className="mb-3 text-sm text-gray-600">
              {completedCount} de {progress.length} lecciones completadas
            </p>
            <div className="space-y-3">
              {progress.map((p) => (
                <div key={p.id} className="rounded border bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">
                      {p.lesson.code} — {p.lesson.name}
                    </h3>
                    <span className={`text-xs ${p.completedOn ? "text-green-700" : "text-gray-400"}`}>
                      {p.completedOn ? `Completada (${new Date(p.completedOn).toLocaleDateString("es-CR")})` : "Pendiente"}
                    </span>
                  </div>
                  {p.lastUpdatedOn && (
                    <p className="mt-1 text-xs text-gray-500">
                      Última actualización: {new Date(p.lastUpdatedOn).toLocaleDateString("es-CR")}
                      {p.isRepeat ? " · repaso" : ""}
                    </p>
                  )}
                  {p.instructorNotes && <p className="mt-2 text-sm">{p.instructorNotes}</p>}
                </div>
              ))}
            </div>
          </>
        )}

        {view === "clases" && (
          <div className="space-y-4">
            {sessions.length === 0 && <p className="text-sm text-gray-500">Todavía no hay clases registradas.</p>}
            {sessions.map((s) => (
              <div key={s.id} className="rounded-r-lg border-y border-r border-gray-200 border-l-4 border-l-blue-500 bg-white p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">
                    {new Date(s.sessionDate).toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status !== "CERRADA"
                          ? "bg-amber-50 text-amber-800"
                          : s.reportSentAt
                            ? "bg-green-50 text-green-800"
                            : "bg-red-50 text-red-800"
                      }`}
                    >
                      {s.status !== "CERRADA"
                        ? "Abierta (sin cerrar)"
                        : s.reportSentAt
                          ? "Cerrada · reporte enviado"
                          : "Cerrada · correo no enviado"}
                    </span>
                    {s.status === "CERRADA" && (
                      <>
                        <button
                          onClick={() => resendSessionReport(s.id)}
                          disabled={busySessionId === s.id}
                          className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
                        >
                          Reenviar
                        </button>
                        {user?.role === "SUPERVISOR" && (
                          <button
                            onClick={() => reopenSession(s.id)}
                            disabled={busySessionId === s.id}
                            className="text-xs font-medium text-gray-500 hover:underline disabled:opacity-50"
                          >
                            Reabrir
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <p className="mb-3 text-xs text-gray-500">Instructor: {s.instructor.firstName} {s.instructor.lastName}</p>

                <div className="space-y-3">
                  {s.lessons.map((l) => (
                    <div key={l.id} className="rounded border border-gray-100 bg-gray-50 p-3">
                      <p className="text-sm font-medium">
                        {l.lesson.code} — {l.lesson.name}
                        {l.isRepeat && (
                          <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Repaso</span>
                        )}
                      </p>
                      <ul className="mt-1.5 space-y-1 text-xs text-gray-600">
                        {l.criteriaSnapshot.map((c) => (
                          <li key={c.criterionId} className="flex items-center gap-2">
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${c.rating ? RATING_DOT[c.rating] : "bg-gray-200"}`} />
                            <span className="flex-1">{c.text}</span>
                            <strong className="text-gray-700">{c.rating ? RATING_LABEL[c.rating] : "—"}</strong>
                          </li>
                        ))}
                      </ul>
                      {l.rubricSnapshot.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                          {l.rubricSnapshot.map((r) => {
                            const prev = l.previousRubricSnapshot?.find((p) => p.dimensionId === r.dimensionId);
                            return (
                              <li key={r.dimensionId}>
                                {r.name}: <strong>Nivel {r.level ?? "—"}/4</strong>
                                {prev && prev.level != null && (
                                  <span className="text-gray-400"> (antes: nivel {prev.level})</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                      {l.instructorNotes && <p className="mt-1 text-xs italic text-gray-500">{l.instructorNotes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
