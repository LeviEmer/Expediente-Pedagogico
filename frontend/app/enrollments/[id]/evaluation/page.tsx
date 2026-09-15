"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, GeneralEvaluationDimension } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

export default function GeneralEvaluationPage() {
  const { id: enrollmentId } = useParams<{ id: string }>();
  const router = useRouter();
  const [dimensions, setDimensions] = useState<GeneralEvaluationDimension[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observations, setObservations] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<GeneralEvaluationDimension[]>("/course-types/meta/general-evaluation-dimensions").then(setDimensions);
  }, []);

  async function saveEvaluation() {
    setBusy(true);
    setStatus(null);
    try {
      await api.patch(`/enrollments/${enrollmentId}/general-evaluation`, {
        scores: Object.entries(scores).map(([dimensionId, level]) => ({ dimensionId, level })),
        personalObservations: observations || undefined,
      });
      setStatus("Evaluación general guardada.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function finishCourse() {
    if (!window.confirm("¿Finalizar el curso y enviar el reporte general? Esta acción no se puede deshacer.")) {
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      await saveEvaluation();
      await api.patch(`/enrollments/${enrollmentId}/finish`);
      setStatus("Curso finalizado. Reporte general enviado al alumno.");
      setTimeout(() => router.push(`/enrollments/${enrollmentId}/history`), 1500);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al finalizar el curso");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-lg font-semibold">Evaluación general</h1>

        {status && <p className="mb-4 rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">{status}</p>}

        <div className="space-y-6">
          {dimensions.map((dim) => (
            <div key={dim.id} className="rounded-r-lg border-y border-r border-gray-200 border-l-4 border-l-blue-500 bg-white p-4">
              <p className="mb-2 font-medium">{dim.name}</p>
              <div className="mb-2 flex gap-2">
                {dim.levels.map((lvl) => {
                  const active = scores[dim.id] === lvl.level;
                  return (
                    <button
                      key={lvl.level}
                      type="button"
                      onClick={() => setScores((s) => ({ ...s, [dim.id]: lvl.level }))}
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
                  const active = scores[dim.id] === lvl.level;
                  return (
                    <li key={lvl.level} className={`text-xs ${active ? "font-medium text-blue-800" : "text-gray-400"}`}>
                      {lvl.level}: {lvl.description}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div>
            <label className="text-sm font-medium">Observaciones personales</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={saveEvaluation} disabled={busy} className="rounded border px-4 py-2 text-sm font-medium disabled:opacity-50">
              Guardar evaluación
            </button>
            <button
              onClick={finishCourse}
              disabled={busy}
              className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              title="Esta acción finaliza el curso y no se puede deshacer"
            >
              Finalizar curso y enviar reporte general
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
