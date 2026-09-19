"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, CheckCircle2, ClipboardList, RotateCcw, Save, Send, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, CriterionRating, Enrollment, EnrollmentLessonProgress, Lesson } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { BackLink, Button, ConfirmDialog } from "@/components/ui";

type LessonFormState = {
  criteria: Record<string, CriterionRating>;
  rubric: Record<string, number>;
  isRepeat: boolean;
  instructorNotes: string;
};

const RATING_OPTIONS: { value: CriterionRating; label: string }[] = [
  { value: "NO", label: "No" },
  { value: "MEDIO", label: "Medio" },
  { value: "SI", label: "Sí" },
];

export default function ClassSessionPage() {
  const { id: enrollmentId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<EnrollmentLessonProgress[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Record<string, LessonFormState>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  // El currículo de esta matrícula ya viene filtrado por transmisión desde el
  // backend (R1): en automático no incluye L00-L04. No se vuelve a pedir el
  // catálogo completo del curso para no mostrar lecciones que no aplican.
  const lessons = useMemo(
    () => progress.map((p) => p.lesson).sort((a, b) => a.orderIndex - b.orderIndex),
    [progress],
  );

  useEffect(() => {
    if (!enrollmentId || !user?.instructorId) return;
    (async () => {
      const enr = await api.get<Enrollment>(`/enrollments/${enrollmentId}`);
      setEnrollment(enr);
      const [prog, session] = await Promise.all([
        api.get<EnrollmentLessonProgress[]>(`/enrollments/${enrollmentId}/progress`),
        api.post<{ id: string }>(`/enrollments/${enrollmentId}/class-sessions`, { instructorId: user.instructorId }),
      ]);
      setProgress(prog);
      setSessionId(session.id);
    })();
  }, [enrollmentId, user]);

  // Datos generales que no siempre se saben al matricular (el recorrido de
  // exámenes y la localización pueden pasar cualquier día del curso) — se
  // dejan visibles aquí para marcarlos el día que realmente sucedan, no solo
  // al crear la matrícula.
  async function toggleGeneralData(field: "recorridoExamenes" | "localizacionHipotecarioVmtPlazaJardin") {
    if (!enrollment) return;
    const value = !enrollment[field];
    setEnrollment({ ...enrollment, [field]: value });
    try {
      await api.patch(`/enrollments/${enrollmentId}`, { [field]: value });
    } catch (err) {
      setEnrollment((prev) => (prev ? { ...prev, [field]: !value } : prev));
      setStatus(err instanceof Error ? err.message : "Error al actualizar datos generales");
    }
  }

  function progressFor(lessonId: string) {
    return progress.find((p) => p.lessonId === lessonId);
  }

  function toggleLesson(lesson: Lesson) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lesson.id)) {
        next.delete(lesson.id);
      } else {
        next.add(lesson.id);
        if (!form[lesson.id]) {
          const prior = progressFor(lesson.id);
          const criteria: Record<string, CriterionRating> = {};
          for (const c of prior?.criteriaResults ?? []) {
            if (c.rating) criteria[c.criterionId] = c.rating;
          }
          const rubric: Record<string, number> = {};
          for (const r of prior?.rubricScores ?? []) {
            if (r.level) rubric[r.dimensionId] = r.level;
          }
          setForm((f) => ({
            ...f,
            [lesson.id]: {
              criteria,
              rubric,
              isRepeat: !!prior?.lastUpdatedOn,
              instructorNotes: prior?.instructorNotes ?? "",
            },
          }));
        }
      }
      return next;
    });
  }

  function updateCriterion(lessonId: string, criterionId: string, rating: CriterionRating) {
    setForm((f) => ({
      ...f,
      [lessonId]: { ...f[lessonId], criteria: { ...f[lessonId].criteria, [criterionId]: rating } },
    }));
  }

  function updateRubric(lessonId: string, dimensionId: string, level: number) {
    setForm((f) => ({
      ...f,
      [lessonId]: { ...f[lessonId], rubric: { ...f[lessonId].rubric, [dimensionId]: level } },
    }));
  }

  function updateField<K extends keyof LessonFormState>(lessonId: string, key: K, value: LessonFormState[K]) {
    setForm((f) => ({ ...f, [lessonId]: { ...f[lessonId], [key]: value } }));
  }

  const payload = useMemo(() => {
    return Array.from(selected).map((lessonId) => {
      const lesson = lessons.find((l) => l.id === lessonId)!;
      const state = form[lessonId];
      return {
        lessonId,
        criteria: lesson.criteria.map((c) => ({
          criterionId: c.id,
          rating: state.criteria[c.id] ?? (c.notApplicableIfAutomatic && enrollment?.transmission === "AUTOMATICO" ? "NA" : "NO"),
        })),
        rubric: lesson.rubricDimensions
          .filter((d) => state.rubric[d.id])
          .map((d) => ({ dimensionId: d.id, level: state.rubric[d.id] })),
        isRepeat: state.isRepeat,
        instructorNotes: state.instructorNotes || undefined,
      };
    });
  }, [selected, form, lessons, enrollment]);

  async function saveProgress() {
    if (!sessionId) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.patch(`/class-sessions/${sessionId}/lessons`, { lessons: payload });
      setStatus("Avance guardado.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function closeAndSend() {
    if (!sessionId) return;
    setBusy(true);
    setStatus(null);
    try {
      await api.patch(`/class-sessions/${sessionId}/lessons`, { lessons: payload });
      await api.post(`/class-sessions/${sessionId}/close`);
      router.push(`/enrollments/${enrollmentId}/history`);
    } catch (err) {
      setConfirmClose(false);
      setStatus(err instanceof Error ? err.message : "Error al cerrar la clase");
      setBusy(false);
    }
  }

  const completedCount = progress.filter((p) => p.completedOn).length;
  const totalCount = progress.length || lessons.length;

  const RATING_STYLES: Record<CriterionRating, { dot: string; selectedBg: string; selectedText: string }> = {
    NO: { dot: "bg-red-500", selectedBg: "bg-red-50", selectedText: "text-red-800" },
    MEDIO: { dot: "bg-amber-500", selectedBg: "bg-amber-50", selectedText: "text-amber-800" },
    SI: { dot: "bg-green-500", selectedBg: "bg-green-50", selectedText: "text-green-800" },
    NA: { dot: "bg-gray-300", selectedBg: "bg-gray-50", selectedText: "text-gray-500" },
  };

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <BackLink />
        <div className="mb-1 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h1 className="text-xl font-semibold text-gray-900">Clase de hoy</h1>
        </div>
        {enrollment?.student && (
          <p className="mb-4 text-sm text-gray-500">
            {enrollment.student.firstName} {enrollment.student.lastName} · {enrollment.courseType?.name} ·{" "}
            {enrollment.transmission}
          </p>
        )}

        {enrollment && (!enrollment.recorridoExamenes || !enrollment.localizacionHipotecarioVmtPlazaJardin) && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-amber-800">
              <ClipboardList className="h-3.5 w-3.5" aria-hidden="true" />
              Datos generales pendientes — márcalos el día que sucedan
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={!!enrollment.recorridoExamenes}
                  onChange={() => toggleGeneralData("recorridoExamenes")}
                  className="h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-400"
                />
                Recorrido de exámenes
              </label>
              <label className="flex items-center gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={!!enrollment.localizacionHipotecarioVmtPlazaJardin}
                  onChange={() => toggleGeneralData("localizacionHipotecarioVmtPlazaJardin")}
                  className="h-4 w-4 rounded border-amber-300 text-blue-600 focus:ring-blue-400"
                />
                Localización (Hipotecario / VMT / Plaza Jardín)
              </label>
            </div>
          </div>
        )}

        {totalCount > 0 && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-blue-600 transition-all"
                style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs font-medium text-gray-500">
              {completedCount}/{totalCount} lecciones
            </span>
          </div>
        )}

        {status && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {status}
          </p>
        )}

        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Lecciones de hoy — toca para agregar</p>
        <div className="mb-6 flex flex-wrap gap-2">
          {lessons.map((l) => {
            const prior = progressFor(l.id);
            const isSelected = selected.has(l.id);
            const isCompleted = !!prior?.completedOn;
            const chipClass = isSelected
              ? "border-2 border-blue-500 bg-blue-50 text-blue-800 font-medium"
              : isCompleted
                ? "border border-transparent bg-green-50 text-green-800"
                : "border border-gray-200 bg-white text-gray-500 hover:border-gray-300";
            return (
              <button key={l.id} onClick={() => toggleLesson(l)} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors ${chipClass}`}>
                {isCompleted && !isSelected && <Check className="h-3 w-3" aria-hidden="true" />}
                {l.code}
              </button>
            );
          })}
        </div>

        {selected.size === 0 && (
          <p className="mb-6 rounded-xl border border-dashed border-gray-200 bg-white/60 px-4 py-6 text-center text-sm text-gray-400">
            Selecciona una o varias lecciones arriba para empezar a capturar la clase.
          </p>
        )}

        <div className="space-y-4">
          {Array.from(selected).map((lessonId) => {
            const lesson = lessons.find((l) => l.id === lessonId)!;
            const state = form[lessonId];
            if (!state) return null;
            return (
              <div key={lessonId} className="rounded-r-lg border-y border-r border-gray-200 border-l-4 border-l-blue-500 bg-white p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">
                    {lesson.code} — {lesson.name}
                  </h2>
                  {lesson.hasRubric && (
                    <button
                      type="button"
                      onClick={() => updateField(lessonId, "isRepeat", !state.isRepeat)}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        state.isRepeat ? "bg-amber-100 text-amber-800" : "border border-gray-200 text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      <RotateCcw className="h-3 w-3" aria-hidden="true" />
                      Repaso
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {lesson.criteria.map((c) => {
                    const na = c.notApplicableIfAutomatic && enrollment?.transmission === "AUTOMATICO";
                    const rating = na ? "NA" : state.criteria[c.id];
                    const style = rating ? RATING_STYLES[rating] : null;
                    return (
                      <div key={c.id} className="flex flex-col gap-1.5 py-1.5 sm:flex-row sm:items-center sm:gap-3 sm:py-1">
                        <div className="flex items-start gap-2 sm:flex-1 sm:items-center">
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full sm:mt-0 ${style?.dot ?? "bg-gray-200"}`} />
                          <span className="text-sm">{c.text}</span>
                        </div>
                        {na ? (
                          <span className="pl-4 text-xs text-gray-400 sm:pl-0">No aplica</span>
                        ) : (
                          <div className="flex shrink-0 gap-1 pl-4 sm:pl-0">
                            {RATING_OPTIONS.map((opt) => {
                              const active = state.criteria[c.id] === opt.value;
                              const s = RATING_STYLES[opt.value];
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  onClick={() => updateCriterion(lessonId, c.id, opt.value)}
                                  className={`rounded px-2.5 py-1 text-xs font-medium ${
                                    active ? `${s.selectedBg} ${s.selectedText}` : "text-gray-400 hover:bg-gray-50"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {lesson.rubricDimensions.map((dim) => (
                  <div key={dim.id} className="mt-4 border-t border-gray-100 pt-4">
                    <p className="mb-2 text-sm font-medium">{dim.name}</p>
                    <div className="mb-2 flex gap-2">
                      {dim.levels.map((lvl) => {
                        const active = state.rubric[dim.id] === lvl.level;
                        return (
                          <button
                            key={lvl.level}
                            type="button"
                            onClick={() => updateRubric(lessonId, dim.id, lvl.level)}
                            className={`h-8 flex-1 rounded text-xs font-medium ${
                              active ? "bg-blue-600 text-white" : "border border-gray-200 text-gray-400 hover:bg-gray-50"
                            }`}
                          >
                            {lvl.level}
                          </button>
                        );
                      })}
                    </div>
                    <ul className="space-y-0.5">
                      {dim.levels.map((lvl) => {
                        const active = state.rubric[dim.id] === lvl.level;
                        return (
                          <li key={lvl.level} className={`text-xs ${active ? "font-medium text-blue-800" : "text-gray-400"}`}>
                            {lvl.level}: {lvl.description}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                <div className="mt-4">
                  <label className="text-sm font-medium">Notas del instructor</label>
                  <textarea
                    value={state.instructorNotes}
                    onChange={(e) => updateField(lessonId, "instructorNotes", e.target.value)}
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {selected.size > 0 && (
          <div className="sticky bottom-0 mt-6 flex flex-col gap-2 border-t border-gray-200 bg-slate-50/95 py-4 backdrop-blur sm:flex-row sm:gap-3">
            <Button variant="secondary" icon={Save} onClick={saveProgress} busy={busy} fullWidthOnMobile>
              Guardar avance
            </Button>
            <Button variant="primary" icon={Send} onClick={() => setConfirmClose(true)} busy={busy} fullWidthOnMobile>
              Cerrar y enviar reporte
            </Button>
          </div>
        )}

        <ConfirmDialog
          open={confirmClose}
          title="¿Cerrar la clase de hoy?"
          description="Se enviará el reporte al alumno y ya no podrás editar esta clase después."
          confirmLabel="Cerrar y enviar"
          busy={busy}
          onConfirm={closeAndSend}
          onCancel={() => setConfirmClose(false)}
        />
      </main>
    </div>
  );
}
