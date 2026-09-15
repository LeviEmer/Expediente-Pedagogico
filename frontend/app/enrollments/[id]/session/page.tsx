"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, CriterionRating, Enrollment, EnrollmentLessonProgress, Lesson } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

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

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [progress, setProgress] = useState<EnrollmentLessonProgress[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [form, setForm] = useState<Record<string, LessonFormState>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
    if (!window.confirm("¿Cerrar la clase de hoy y enviar el reporte al alumno? Ya no podrás editarla después.")) {
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await api.patch(`/class-sessions/${sessionId}/lessons`, { lessons: payload });
      await api.post(`/class-sessions/${sessionId}/close`);
      setStatus("Clase cerrada y reporte enviado al alumno.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al cerrar la clase");
    } finally {
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
    <div>
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-1 text-lg font-semibold">Clase de hoy</h1>
        {enrollment?.student && (
          <p className="mb-4 text-sm text-gray-500">
            {enrollment.student.firstName} {enrollment.student.lastName} · {enrollment.courseType?.name} ·{" "}
            {enrollment.transmission}
          </p>
        )}

        {totalCount > 0 && (
          <div className="mb-4 flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-gray-200">
              <div
                className="h-1.5 rounded-full bg-blue-600"
                style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs text-gray-500">
              {completedCount}/{totalCount} lecciones
            </span>
          </div>
        )}

        {status && <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">{status}</p>}

        <div className="mb-6 flex flex-wrap gap-2">
          {lessons.map((l) => {
            const prior = progressFor(l.id);
            const isSelected = selected.has(l.id);
            const isCompleted = !!prior?.completedOn;
            const chipClass = isSelected
              ? "border-2 border-blue-500 bg-blue-50 text-blue-800 font-medium"
              : isCompleted
                ? "border border-transparent bg-green-50 text-green-800"
                : "border border-gray-200 bg-white text-gray-500";
            return (
              <button key={l.id} onClick={() => toggleLesson(l)} className={`rounded px-3 py-1.5 text-xs ${chipClass}`}>
                {l.code}
              </button>
            );
          })}
        </div>

        <div className="space-y-4">
          {Array.from(selected).map((lessonId) => {
            const lesson = lessons.find((l) => l.id === lessonId)!;
            const state = form[lessonId];
            if (!state) return null;
            return (
              <div key={lessonId} className="rounded-r-lg border-y border-r border-gray-200 border-l-4 border-l-blue-500 bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold">
                    {lesson.code} — {lesson.name}
                  </h2>
                  {lesson.hasRubric && (
                    <button
                      type="button"
                      onClick={() => updateField(lessonId, "isRepeat", !state.isRepeat)}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        state.isRepeat ? "bg-amber-100 text-amber-800" : "border border-gray-200 text-gray-400"
                      }`}
                    >
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
                      <div key={c.id} className="flex items-center gap-3 py-1">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${style?.dot ?? "bg-gray-200"}`} />
                        <span className="flex-1 text-sm">{c.text}</span>
                        {na ? (
                          <span className="text-xs text-gray-400">No aplica</span>
                        ) : (
                          <div className="flex gap-1">
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
          <div className="sticky bottom-0 mt-6 flex gap-3 border-t bg-gray-50 py-4">
            <button onClick={saveProgress} disabled={busy} className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50">
              Guardar avance
            </button>
            <button
              onClick={closeAndSend}
              disabled={busy}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 hover:bg-blue-700"
            >
              Cerrar y enviar reporte
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
