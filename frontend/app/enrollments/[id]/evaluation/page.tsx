"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ClipboardCheck, FlagTriangleRight, Save } from "lucide-react";
import { api, GeneralEvaluationDimension } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { BackLink, Button, Card, ConfirmDialog, PageHeader } from "@/components/ui";

export default function GeneralEvaluationPage() {
  const { id: enrollmentId } = useParams<{ id: string }>();
  const router = useRouter();
  const [dimensions, setDimensions] = useState<GeneralEvaluationDimension[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [observations, setObservations] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);

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
    setBusy(true);
    setStatus(null);
    try {
      await saveEvaluation();
      await api.patch(`/enrollments/${enrollmentId}/finish`);
      router.push(`/enrollments/${enrollmentId}/history`);
    } catch (err) {
      setConfirmFinish(false);
      setStatus(err instanceof Error ? err.message : "Error al finalizar el curso");
      setBusy(false);
    }
  }

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <BackLink />
        <PageHeader
          eyebrow="Cierre de curso"
          title="Evaluación general"
          subtitle="Califica cada dimensión y agrega observaciones antes de finalizar el curso."
        />

        {status && (
          <p className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {status}
          </p>
        )}

        <div className="space-y-4">
          {dimensions.map((dim) => (
            <Card key={dim.id} accent="blue">
              <p className="mb-2 flex items-center gap-2 font-medium text-gray-900">
                <ClipboardCheck className="h-4 w-4 text-blue-600" aria-hidden="true" />
                {dim.name}
              </p>
              <div className="mb-2 flex gap-2">
                {dim.levels.map((lvl) => {
                  const active = scores[dim.id] === lvl.level;
                  return (
                    <button
                      key={lvl.level}
                      type="button"
                      onClick={() => setScores((s) => ({ ...s, [dim.id]: lvl.level }))}
                      className={`h-9 flex-1 rounded-lg text-xs font-medium transition-colors ${
                        active ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20" : "border border-gray-200 text-gray-400 hover:bg-gray-50"
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
            </Card>
          ))}

          <Card>
            <label className="text-sm font-medium text-gray-700">Observaciones personales</label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
              placeholder="Notas libres sobre el desempeño general del alumno..."
              className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </Card>

          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <Button variant="secondary" icon={Save} onClick={saveEvaluation} busy={busy} fullWidthOnMobile>
              Guardar evaluación
            </Button>
            <Button
              variant="warning"
              icon={FlagTriangleRight}
              onClick={() => setConfirmFinish(true)}
              busy={busy}
              fullWidthOnMobile
              title="Esta acción finaliza el curso y no se puede deshacer"
            >
              Finalizar curso y enviar reporte
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmFinish}
          title="¿Finalizar el curso?"
          description="Se enviará el reporte general al alumno y ya no podrás editar esta matrícula después. Esta acción no se puede deshacer."
          confirmLabel="Finalizar y enviar"
          variant="warning"
          busy={busy}
          onConfirm={finishCourse}
          onCancel={() => setConfirmFinish(false)}
        />
      </main>
    </div>
  );
}
