"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api, CourseType, Instructor, Student } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

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
    <div>
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-lg font-semibold">Nueva matrícula</h1>

        <form onSubmit={onSubmit} className="space-y-6 rounded border bg-white p-6">
          {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Alumno</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input type="radio" checked={studentMode === "new"} onChange={() => setStudentMode("new")} />
                Alumno nuevo
              </label>
              <label className="flex items-center gap-1">
                <input type="radio" checked={studentMode === "existing"} onChange={() => setStudentMode("existing")} />
                Alumno existente
              </label>
            </div>

            {studentMode === "existing" ? (
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} required className="w-full rounded border px-3 py-2 text-sm">
                <option value="">Seleccionar alumno...</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} — {s.email}
                  </option>
                ))}
              </select>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Nombre" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="rounded border px-3 py-2 text-sm" />
                <input placeholder="Apellidos" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="rounded border px-3 py-2 text-sm" />
                <input placeholder="Correo" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-2 rounded border px-3 py-2 text-sm" />
                <input placeholder="Teléfono (opcional)" value={phone} onChange={(e) => setPhone(e.target.value)} className="col-span-2 rounded border px-3 py-2 text-sm" />
              </div>
            )}
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold">Curso</legend>
            <div className="grid grid-cols-2 gap-3">
              <select value={courseTypeId} onChange={(e) => setCourseTypeId(e.target.value)} required className="rounded border px-3 py-2 text-sm">
                {courseTypes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select value={transmission} onChange={(e) => setTransmission(e.target.value as "ESTANDAR" | "AUTOMATICO")} className="rounded border px-3 py-2 text-sm">
                <option value="ESTANDAR">Estándar</option>
                <option value="AUTOMATICO">Automático</option>
              </select>
              <label className="col-span-2 text-sm">
                Fecha de inicio
                <input type="date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full rounded border px-3 py-2 text-sm" />
              </label>

              {user?.role === "SUPERVISOR" && (
                <label className="col-span-2 text-sm">
                  Instructor asignado
                  <select
                    value={instructorId}
                    onChange={(e) => setInstructorId(e.target.value)}
                    required
                    className="mt-1 w-full rounded border px-3 py-2 text-sm"
                  >
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

          <fieldset className="space-y-2 text-sm">
            <legend className="text-sm font-semibold">Datos generales</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={recorridoExamenes} onChange={(e) => setRecorridoExamenes(e.target.checked)} />
              Recorrido de exámenes
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={localizacion} onChange={(e) => setLocalizacion(e.target.checked)} />
              Localización (Hipotecario / VMT / Plaza / Jardín)
            </label>
          </fieldset>

          <button type="submit" disabled={busy} className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {busy ? "Guardando..." : "Matricular y comenzar clase de hoy"}
          </button>
        </form>
      </main>
    </div>
  );
}
