"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api, CourseType, Enrollment, Instructor, Student } from "@/lib/api";
import { NavBar } from "@/components/NavBar";

function matches(query: string, ...fields: (string | undefined | null)[]) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

export default function SupervisorPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);

  const [newInstructor, setNewInstructor] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [status, setStatus] = useState<string | null>(null);

  const [instructorQuery, setInstructorQuery] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [enrollmentQuery, setEnrollmentQuery] = useState("");

  const [editingInstructorId, setEditingInstructorId] = useState<string | null>(null);
  const [instructorEdit, setInstructorEdit] = useState({ firstName: "", lastName: "", email: "" });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentEdit, setStudentEdit] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  function reload() {
    api.get<Student[]>("/students").then(setStudents);
    api.get<Instructor[]>("/instructors").then(setInstructors);
    api.get<CourseType[]>("/course-types").then(setCourseTypes);
    api.get<Enrollment[]>("/enrollments").then(setEnrollments);
  }

  useEffect(reload, []);

  const filteredInstructors = useMemo(
    () => instructors.filter((i) => matches(instructorQuery, i.firstName, i.lastName, i.email)),
    [instructors, instructorQuery],
  );
  const filteredStudents = useMemo(
    () => students.filter((s) => matches(studentQuery, s.firstName, s.lastName, s.email)),
    [students, studentQuery],
  );
  const filteredEnrollments = useMemo(
    () =>
      enrollments.filter((e) =>
        matches(enrollmentQuery, e.student?.firstName, e.student?.lastName, e.courseType?.name, e.instructor?.firstName, e.instructor?.lastName),
      ),
    [enrollments, enrollmentQuery],
  );

  async function createInstructor(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    try {
      await api.post("/instructors", {
        ...newInstructor,
        password: newInstructor.password || undefined,
      });
      setNewInstructor({ firstName: "", lastName: "", email: "", password: "" });
      setStatus("Instructor creado.");
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al crear instructor");
    }
  }

  function startEditInstructor(i: Instructor) {
    setEditingInstructorId(i.id);
    setInstructorEdit({ firstName: i.firstName, lastName: i.lastName, email: i.email });
  }

  async function saveInstructor(id: string) {
    setStatus(null);
    try {
      await api.patch(`/instructors/${id}`, instructorEdit);
      setEditingInstructorId(null);
      setStatus("Instructor actualizado.");
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al actualizar instructor");
    }
  }

  async function toggleInstructorActive(i: Instructor) {
    setStatus(null);
    try {
      await api.patch(`/instructors/${i.id}`, { active: !i.active });
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al cambiar el estado del instructor");
    }
  }

  function startEditStudent(s: Student) {
    setEditingStudentId(s.id);
    setStudentEdit({ firstName: s.firstName, lastName: s.lastName, email: s.email, phone: s.phone ?? "" });
  }

  async function saveStudent(id: string) {
    setStatus(null);
    try {
      await api.patch(`/students/${id}`, { ...studentEdit, phone: studentEdit.phone || undefined });
      setEditingStudentId(null);
      setStatus("Alumno actualizado.");
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al actualizar alumno");
    }
  }

  async function reassignInstructor(enrollmentId: string, instructorId: string) {
    if (!instructorId) return;
    setStatus(null);
    try {
      await api.patch(`/enrollments/${enrollmentId}/claim-instructor`, { instructorId });
      setStatus("Instructor reasignado.");
      reload();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error al reasignar instructor");
    }
  }

  return (
    <div>
      <NavBar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <h1 className="text-lg font-semibold">Panel de supervisor</h1>
        {status && <p className="rounded bg-blue-50 px-3 py-2 text-sm text-blue-700">{status}</p>}

        <section>
          <h2 className="mb-2 font-medium">Tipos de curso</h2>
          <div className="flex gap-2">
            {courseTypes.map((c) => (
              <span key={c.id} className="rounded-full border bg-white px-3 py-1 text-sm">
                {c.name}
              </span>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 font-medium">Instructores</h2>
          <form onSubmit={createInstructor} className="mb-3 flex flex-wrap gap-2">
            <input
              placeholder="Nombre"
              required
              value={newInstructor.firstName}
              onChange={(e) => setNewInstructor((s) => ({ ...s, firstName: e.target.value }))}
              className="rounded border px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Apellidos"
              required
              value={newInstructor.lastName}
              onChange={(e) => setNewInstructor((s) => ({ ...s, lastName: e.target.value }))}
              className="rounded border px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Correo"
              type="email"
              required
              value={newInstructor.email}
              onChange={(e) => setNewInstructor((s) => ({ ...s, email: e.target.value }))}
              className="rounded border px-3 py-1.5 text-sm"
            />
            <input
              placeholder="Contraseña (opcional, crea acceso)"
              value={newInstructor.password}
              onChange={(e) => setNewInstructor((s) => ({ ...s, password: e.target.value }))}
              className="rounded border px-3 py-1.5 text-sm"
            />
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
              Agregar
            </button>
          </form>

          <input
            value={instructorQuery}
            onChange={(e) => setInstructorQuery(e.target.value)}
            placeholder="Buscar instructor..."
            className="mb-2 w-full max-w-xs rounded border px-3 py-1.5 text-sm"
          />

          <ul className="divide-y rounded border bg-white text-sm">
            {filteredInstructors.map((i) => (
              <li key={i.id} className="px-4 py-2">
                {editingInstructorId === i.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={instructorEdit.firstName}
                      onChange={(e) => setInstructorEdit((s) => ({ ...s, firstName: e.target.value }))}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <input
                      value={instructorEdit.lastName}
                      onChange={(e) => setInstructorEdit((s) => ({ ...s, lastName: e.target.value }))}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <input
                      value={instructorEdit.email}
                      onChange={(e) => setInstructorEdit((s) => ({ ...s, email: e.target.value }))}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <button onClick={() => saveInstructor(i.id)} className="text-xs font-medium text-blue-700 hover:underline">
                      Guardar
                    </button>
                    <button onClick={() => setEditingInstructorId(null)} className="text-xs text-gray-500 hover:underline">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className={i.active === false ? "text-gray-400 line-through" : ""}>
                      {i.firstName} {i.lastName} — {i.email}
                      {i.active === false && <span className="ml-2 text-xs no-underline">(inactivo)</span>}
                    </span>
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => startEditInstructor(i)} className="text-blue-700 hover:underline">
                        Editar
                      </button>
                      <button onClick={() => toggleInstructorActive(i)} className="text-gray-500 hover:underline">
                        {i.active === false ? "Reactivar" : "Desactivar"}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-medium">Matrículas</h2>
          <input
            value={enrollmentQuery}
            onChange={(e) => setEnrollmentQuery(e.target.value)}
            placeholder="Buscar matrícula por alumno, curso o instructor..."
            className="mb-2 w-full max-w-xs rounded border px-3 py-1.5 text-sm"
          />
          <ul className="divide-y rounded border bg-white text-sm">
            {filteredEnrollments.length === 0 && <li className="px-4 py-3 text-gray-500">No hay matrículas que coincidan.</li>}
            {filteredEnrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2">
                <span>
                  {e.student?.firstName} {e.student?.lastName} — {e.courseType?.name} · {e.transmission} · {e.status}
                </span>
                <div className="flex items-center gap-3">
                  <select
                    value={e.instructor?.id ?? ""}
                    onChange={(ev) => reassignInstructor(e.id, ev.target.value)}
                    className="rounded border px-2 py-1 text-xs"
                  >
                    <option value="" disabled>
                      Sin instructor
                    </option>
                    {instructors
                      .filter((i) => i.active !== false)
                      .map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.firstName} {i.lastName}
                        </option>
                      ))}
                  </select>
                  <Link href={`/enrollments/${e.id}/history`} className="text-xs text-blue-700 hover:underline">
                    Ver historial y clases
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-medium">Alumnos</h2>
          <input
            value={studentQuery}
            onChange={(e) => setStudentQuery(e.target.value)}
            placeholder="Buscar alumno..."
            className="mb-2 w-full max-w-xs rounded border px-3 py-1.5 text-sm"
          />
          <ul className="divide-y rounded border bg-white text-sm">
            {filteredStudents.map((s) => (
              <li key={s.id} className="px-4 py-2">
                {editingStudentId === s.id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={studentEdit.firstName}
                      onChange={(e) => setStudentEdit((v) => ({ ...v, firstName: e.target.value }))}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <input
                      value={studentEdit.lastName}
                      onChange={(e) => setStudentEdit((v) => ({ ...v, lastName: e.target.value }))}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <input
                      value={studentEdit.email}
                      onChange={(e) => setStudentEdit((v) => ({ ...v, email: e.target.value }))}
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <input
                      value={studentEdit.phone}
                      onChange={(e) => setStudentEdit((v) => ({ ...v, phone: e.target.value }))}
                      placeholder="Teléfono"
                      className="rounded border px-2 py-1 text-sm"
                    />
                    <button onClick={() => saveStudent(s.id)} className="text-xs font-medium text-blue-700 hover:underline">
                      Guardar
                    </button>
                    <button onClick={() => setEditingStudentId(null)} className="text-xs text-gray-500 hover:underline">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>
                      {s.firstName} {s.lastName} — {s.email}
                    </span>
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => startEditStudent(s)} className="text-blue-700 hover:underline">
                        Editar
                      </button>
                      <Link href="/enrollments/new" className="text-blue-700 hover:underline">
                        Nueva matrícula
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
