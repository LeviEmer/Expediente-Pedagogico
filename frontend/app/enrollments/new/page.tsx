"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Car, ClipboardList, GraduationCap, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api, CourseType, Instructor, Student } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { Button, PageHeader } from "@/components/ui";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

export default function NewEnrollmentPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Datos generales del alumno (para crearlo junto con la matrícula si es nuevo)
  const [studentMode, setStudentMode] = useState<"new" | "existing">("new");
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [courseTypeId, setCourseTypeId] = useState("");
  const [transmission, setTransmission] = useState<"ESTANDAR" | "AUTOMATICO">("ESTANDAR");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [recorridoExamenes, setRecorridoExamenes] = useState(false);
  const [localizacion, setLocalizacion] = useState(false);

  // El supervisor debe elegir a qué instructor asigna la matrícula; el instructor
  // se asigna automáticamente a sí mismo.
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [instructorId, setInstructorId] = useState("");

  useEffect(() => {
    api.get<CourseType[]>("/course-types").then((types) => {
      setCourseTypes(types);
      if (types[0]) setCourseTypeId(types[0].id);
    });
    api.get<Student[]>("/students").then(setStudents);
    if (user?.role === "SUPERVISOR") {
      api.get<Instructor[]>("/instructors").then((all) => {
        const active = all.filter((i) => i.active !== false);
        setInstructors(active);
        if (active[0]) setInstructorId(active[0].id);
      });
    }
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let finalStudentId = studentId;
      if (studentMode === "new") {
        const student = await api.post<Student>("/students", { firstName, lastName, email, phone: phone || undefined });
        finalStudentId = student.id;
      }

      const finalInstructorId = user?.role === "SUPERVISOR" ? instructorId : (user?.instructorId ?? undefined);

      const enrollment = await api.post<{ id: string }>("/enrollments", {
        studentId: finalStudentId,
        courseTypeId,
        instructorId: finalInstructorId || undefined,
        transmission,
        startDate: new Date(startDate).toISOString(),
        recorridoExamenes,
        localizacionHipotecarioVmtPlazaJardin: localizacion,
      });

      if (user?.role === "SUPERVISOR") {
        router.push(`/enrollments/${enrollment.id}/history`);
      } else {
        router.push(`/enrollments/${enrollment.id}/session`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la matrícula");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <PageHeader eyebrow="Nueva matrícula" title="Matricular un alumno" subtitle="Completa los datos para empezar a darle clases." />

        <form onSubmit={onSubmit} className="space-y-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          {error && (
            <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              {error}
            </p>
          )}

          <fieldset className="space-y-3">
            <legend className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <UserPlus className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Alumno
            </legend>
            <div className="flex gap-2 text-sm">
              <button
                type="button"
                onClick={() => setStudentMode("new")}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${studentMode === "new" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Alumno nuevo
              </button>
              <button
                type="button"
                onClick={() => setStudentMode("existing")}
                className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${studentMode === "existing" ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Alumno existente
              </button>
            </div>

            {studentMode === "existing" ? (
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required className={inputClass}>
                <option value="">Seleccionar alumno...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.email}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input placeholder="Nombre" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                <input placeholder="Apellidos" required value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                <input placeholder="Correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={`sm:col-span-2 ${inputClass}`} />
                <input placeholder="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} className={`sm:col-span-2 ${inputClass}`} />
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3 border-t border-gray-100 pt-5">
            <legend className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-800">
              <Car className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Curso
            </legend>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select value={courseTypeId} onChange={(e) => setCourseTypeId(e.target.value)} required className={inputClass}>
                {courseTypes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={transmission} onChange={(e) => setTransmission(e.target.value as "ESTANDAR" | "AUTOMATICO")} className={inputClass}>
                <option value="ESTANDAR">Estándar</option>
                <option value="AUTOMATICO">Automático</option>
              </select>
              <label className="text-sm text-gray-700 sm:col-span-2">
                Fecha de inicio
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className={`mt-1 ${inputClass}`} />
              </label>

              {user?.role === "SUPERVISOR" && (
                <label className="text-sm text-gray-700 sm:col-span-2">
                  Instructor asignado
                  <select value={instructorId} onChange={(e) => setInstructorId(e.target.value)} required className={`mt-1 ${inputClass}`}>
                    <option value="">Seleccionar instructor...</option>
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.firstName} {i.lastName} — {i.email}
                      </option>
                    ))}
                  </select>
                  {instructors.length === 0 && (
                    <span className="mt-1 block text-xs text-amber-600">
                      No hay instructores registrados todavía — créalos desde el panel de supervisor.
                    </span>
                  )}
                </label>
              )}
            </div>
          </fieldset>

          <fieldset className="space-y-2 border-t border-gray-100 pt-5 text-sm">
            <legend className="mb-1 flex items-center gap-1.5 font-semibold text-gray-800">
              <ClipboardList className="h-4 w-4 text-blue-600" aria-hidden="true" />
              Datos generales
            </legend>
            <label className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" checked={recorridoExamenes} onChange={(e) => setRecorridoExamenes(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400" />
              Recorrido de exámenes
            </label>
            <label className="flex items-center gap-2 text-gray-700">
              <input type="checkbox" checked={localizacion} onChange={(e) => setLocalizacion(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400" />
              Localización (Hipotecario / VMT / Plaza / Jardín)
            </label>
          </fieldset>

          <Button type="submit" icon={GraduationCap} busy={busy} className="w-full">
            {busy ? "Guardando..." : "Matricular y comenzar clase de hoy"}
          </Button>
        </form>
      </main>
    </div>
  );
}
