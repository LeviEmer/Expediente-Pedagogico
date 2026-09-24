"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ClipboardCheck, Mail, MailWarning, PlayCircle, RotateCcw } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, ClassSessionSummary, CriterionRating, Enrollment, EnrollmentLessonProgress } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { BackLink, Badge, Card, ConfirmDialog, cx, EmptyState, LinkButton, LoadingRow, PageHeader } from "@/components/ui";

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
  const [loading, setLoading] = useState(true);
  const [reopenTarget, setReopenTarget] = useState<string | null>(null);
  const [resendSessionTarget, setResendSessionTarget] = useState<string | null>(null);
  const [confirmResendFinal, setConfirmResendFinal] = useState(false);
  const isSupervisorLike = user?.role === "SUPERVISOR" || user?.role === "ADMIN";

  function reload() {
    if (!enrollmentId) return;
    api.get<Enrollment>(`/enrollments/${enrollmentId}`).then(setEnrollment);
    api.get<EnrollmentLessonProgress[]>(`/enrollments/${enrollmentId}/progress`).then(setProgress);
    api
      .get<ClassSessionSummary[]>(`/enrollments/${enrollmentId}/class-sessions`)
      .then(setSessions)
      .finally(() => setLoading(false));
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
      setResendSessionTarget(null);
    }
  }

  async function reopenSession(sessionId: string) {
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
      setReopenTarget(null);
    }
  }

  async function resendFinalReport() {
    setBusySessionId("final");
    setNotice(null);
    try {
      const res = await api.post<{ sent: boolean }>(`/enrollments/${enrollmentId}/resend-final-report`);
      setNotice(res.sent ? "Reporte final reenviado." : "El reenvío falló otra vez — revisa la configuración de correo.");
      reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Error al reenviar el reporte final");
    } finally {
      setBusySessionId(null);
      setConfirmResendFinal(false);
    }
  }

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <BackLink />
        <PageHeader
          title="Historial del alumno"
          subtitle={
            enrollment?.student && (
              <>
                {enrollment.student.firstName} {enrollment.student.lastName} · {enrollment.courseType?.name} · estado:{" "}
                {enrollment.status}
              </>
            )
          }
          actions={
            <>
              <Link href={`/enrollments/${enrollmentId}/evaluation`}>
                <LinkButton variant="secondary" icon={ClipboardCheck}>
                  Evaluación general
                </LinkButton>
              </Link>
              {user?.role === "INSTRUCTOR" && (
                <Link href={`/enrollments/${enrollmentId}/session`}>
                  <LinkButton icon={PlayCircle}>Clase de hoy</LinkButton>
                </Link>
              )}
            </>
          }
        />

        {notice && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {notice}
          </p>
        )}

        {isSupervisorLike && enrollment?.status === "FINALIZADO" && (
          <div
            className={cx(
              "mb-4 flex flex-col gap-1 rounded-lg border px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3",
              enrollment.finalReportSentAt ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800",
            )}
          >
            <span className="flex items-center gap-2">
              {enrollment.finalReportSentAt ? (
                <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : (
                <MailWarning className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              {enrollment.finalReportSentAt
                ? `Reporte final enviado (${new Date(enrollment.finalReportSentAt).toLocaleString("es-CR")})`
                : "El reporte final no se pudo enviar."}
            </span>
            <button onClick={() => setConfirmResendFinal(true)} className="self-start font-medium underline sm:self-auto">
              Reenviar
            </button>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          <button
            onClick={() => setView("estado")}
            className={cx(
              "rounded-full border px-3 py-1.5 font-medium transition-colors",
              view === "estado" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            Estado actual ({progress.length})
          </button>
          <button
            onClick={() => setView("clases")}
            className={cx(
              "rounded-full border px-3 py-1.5 font-medium transition-colors",
              view === "clases" ? "border-blue-600 bg-blue-600 text-white" : "border-gray-200 bg-white text-gray-600 hover:border-gray-300",
            )}
          >
            Clases por día ({sessions.length})
          </button>
        </div>

        {loading && <LoadingRow />}

        {!loading && view === "estado" && (
          <>
            <p className="mb-3 text-sm text-gray-600">
              {completedCount} de {progress.length} lecciones completadas
            </p>
            <div className="space-y-3">
              {progress.map((p) => (
                <Card key={p.id} className="p-4" accent={p.completedOn ? "green" : p.lastUpdatedOn ? "amber" : "none"}>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <h3 className="font-medium">
                      {p.lesson.code} — {p.lesson.name}
                    </h3>
                    {p.completedOn ? (
                      <Badge tone="green">
                        <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                        Completada · {new Date(p.completedOn).toLocaleDateString("es-CR")}
                      </Badge>
                    ) : p.lastUpdatedOn ? (
                      <Badge tone="amber">
                        <RotateCcw className="h-3 w-3" aria-hidden="true" />
                        En repaso
                      </Badge>
                    ) : (
                      <Badge tone="gray">Pendiente</Badge>
                    )}
                  </div>
                  {p.lastUpdatedOn && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
                      Última actualización: {new Date(p.lastUpdatedOn).toLocaleDateString("es-CR")}
                      {p.isRepeat && (
                        <span className="inline-flex items-center gap-0.5 text-amber-600">
                          <RotateCcw className="h-3 w-3" aria-hidden="true" /> repaso
                        </span>
                      )}
                    </p>
                  )}
                  {p.instructorNotes && <p className="mt-2 text-sm text-gray-700">{p.instructorNotes}</p>}
                </Card>
              ))}
            </div>
          </>
        )}

        {!loading && view === "clases" && (
          <div className="space-y-4">
            {sessions.length === 0 && (
              <EmptyState icon={CalendarDays} title="Todavía no hay clases registradas" description="Aquí aparecerá cada sesión una vez que se cierre y se envíe el reporte diario." />
            )}
            {sessions.map((s) => (
              <Card key={s.id} accent="blue" className="p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-1.5 font-medium">
                    <CalendarDays className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    {new Date(s.sessionDate).toLocaleDateString("es-CR", { year: "numeric", month: "long", day: "numeric" })}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={s.status !== "CERRADA" ? "amber" : s.reportSentAt ? "green" : "red"}>
                      {s.status !== "CERRADA" ? "Abierta (sin cerrar)" : s.reportSentAt ? "Reporte enviado" : "Correo no enviado"}
                    </Badge>
                    {s.status === "CERRADA" && (
                      <>
                        <button
                          onClick={() => setResendSessionTarget(s.id)}
                          disabled={busySessionId === s.id}
                          className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
                        >
                          Reenviar
                        </button>
                        {isSupervisorLike && (
                          <button
                            onClick={() => setReopenTarget(s.id)}
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
                    <div key={l.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
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
              </Card>
            ))}
          </div>
        )}

        <ConfirmDialog
          open={!!reopenTarget}
          title="¿Reabrir esta sesión?"
          description="Quedará editable de nuevo para el instructor."
          confirmLabel="Reabrir"
          busy={!!reopenTarget && busySessionId === reopenTarget}
          onConfirm={() => reopenTarget && reopenSession(reopenTarget)}
          onCancel={() => setReopenTarget(null)}
        />

        <ConfirmDialog
          open={!!resendSessionTarget}
          title="¿Reenviar este correo?"
          description="Se le vuelve a mandar el reporte de esa clase al alumno (y copia al instructor y supervisores)."
          confirmLabel="Reenviar"
          busy={!!resendSessionTarget && busySessionId === resendSessionTarget}
          onConfirm={() => resendSessionTarget && resendSessionReport(resendSessionTarget)}
          onCancel={() => setResendSessionTarget(null)}
        />

        <ConfirmDialog
          open={confirmResendFinal}
          title="¿Reenviar el reporte final?"
          description="Se le vuelve a mandar por correo el reporte general en PDF al alumno (y copia al instructor y supervisores)."
          confirmLabel="Reenviar"
          busy={busySessionId === "final"}
          onConfirm={resendFinalReport}
          onCancel={() => setConfirmResendFinal(false)}
        />
      </main>
    </div>
  );
}
