"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Car,
  CheckCircle2,
  ClipboardList,
  Pencil,
  Power,
  Search,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { api, Branch, CourseType, Enrollment, Instructor, Student } from "@/lib/api";
import { NavBar } from "@/components/NavBar";
import { Badge, Button, cx, EmptyState, PageHeader, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";

function matches(query: string, ...fields: (string | undefined | null)[]) {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(q));
}

function initials(a?: string, b?: string) {
  return `${a?.[0] ?? ""}${b?.[0] ?? ""}`.toUpperCase();
}

function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-3 max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
      <TextField value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="pl-9" />
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div>
        <p className="text-lg font-semibold leading-tight text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function SupervisorPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const isReadOnly = user?.role === "GENERAL_SUPERVISOR";
  const showBranchColumn = isAdmin || isReadOnly;

  const [students, setStudents] = useState<Student[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [courseTypes, setCourseTypes] = useState<CourseType[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);

  const [newInstructor, setNewInstructor] = useState({ firstName: "", lastName: "", email: "", password: "", branchId: "" });
  const [status, setStatus] = useState<string | null>(null);

  const [instructorQuery, setInstructorQuery] = useState("");
  const [studentQuery, setStudentQuery] = useState("");

  const [editingInstructorId, setEditingInstructorId] = useState<string | null>(null);
  const [instructorEdit, setInstructorEdit] = useState({ firstName: "", lastName: "", email: "" });
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentEdit, setStudentEdit] = useState({ firstName: "", lastName: "", email: "", phone: "" });

  function reload() {
    api.get<Student[]>("/students").then(setStudents);
    api.get<Instructor[]>("/instructors").then(setInstructors);
    api.get<CourseType[]>("/course-types").then(setCourseTypes);
    api.get<Enrollment[]>("/enrollments").then(setEnrollments);
    if (isAdmin) api.get<Branch[]>("/branches").then(setBranches);
  }

  useEffect(reload, [isAdmin]);

  const filteredInstructors = useMemo(
    () => instructors.filter((i) => matches(instructorQuery, i.firstName, i.lastName, i.email)),
    [instructors, instructorQuery],
  );
  const filteredStudents = useMemo(
    () => students.filter((s) => matches(studentQuery, s.firstName, s.lastName, s.email)),
    [students, studentQuery],
  );
  const activeEnrollmentsCount = enrollments.filter((e) => e.status === "ACTIVO").length;

  async function createInstructor(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (isAdmin && !newInstructor.branchId) {
      setStatus("Elige la sucursal del instructor.");
      return;
    }
    try {
      await api.post("/instructors", {
        ...newInstructor,
        password: newInstructor.password || undefined,
        branchId: newInstructor.branchId || undefined,
      });
      setNewInstructor({ firstName: "", lastName: "", email: "", password: "", branchId: "" });
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

  const editInputClass = "rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100";

  return (
    <div className="md:pl-60">
      <NavBar />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <PageHeader eyebrow="Panel de supervisor" title="Todo tu equipo, en un solo lugar" />

        {status && (
          <p className="flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {status}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={Users} label="Alumnos" value={students.length} />
          <StatCard icon={UserCog} label="Instructores" value={instructors.filter((i) => i.active !== false).length} />
          <Link href="/supervisor/matriculas" className="rounded-xl transition-shadow hover:shadow-md">
            <StatCard icon={ClipboardList} label="Matrículas activas" value={activeEnrollmentsCount} />
          </Link>
          <StatCard icon={Car} label="Tipos de curso" value={courseTypes.length} />
        </div>

        <section>
          <h2 className="mb-2 flex items-center gap-1.5 font-medium text-gray-800">
            <Car className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Tipos de curso
          </h2>
          <div className="flex flex-wrap gap-2">
            {courseTypes.map((c) => (
              <Badge key={c.id} tone="blue">
                {c.name}
              </Badge>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 font-medium text-gray-800">
            <UserCog className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Instructores
          </h2>
          {!isReadOnly && (
            <form onSubmit={createInstructor} className="mb-4 flex flex-wrap gap-2">
              <input
                placeholder="Nombre"
                required
                value={newInstructor.firstName}
                onChange={(e) => setNewInstructor((s) => ({ ...s, firstName: e.target.value }))}
                className={editInputClass}
              />
              <input
                placeholder="Apellidos"
                required
                value={newInstructor.lastName}
                onChange={(e) => setNewInstructor((s) => ({ ...s, lastName: e.target.value }))}
                className={editInputClass}
              />
              <input
                placeholder="Correo"
                type="email"
                required
                value={newInstructor.email}
                onChange={(e) => setNewInstructor((s) => ({ ...s, email: e.target.value }))}
                className={editInputClass}
              />
              <input
                placeholder="Contraseña (opcional, crea acceso)"
                value={newInstructor.password}
                onChange={(e) => setNewInstructor((s) => ({ ...s, password: e.target.value }))}
                className={editInputClass}
              />
              {isAdmin && (
                <select
                  required
                  value={newInstructor.branchId}
                  onChange={(e) => setNewInstructor((s) => ({ ...s, branchId: e.target.value }))}
                  className={editInputClass}
                >
                  <option value="" disabled>
                    Sucursal...
                  </option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
              <Button type="submit" icon={UserPlus}>
                Agregar
              </Button>
            </form>
          )}

          <SearchInput value={instructorQuery} onChange={setInstructorQuery} placeholder="Buscar instructor..." />

          {filteredInstructors.length === 0 ? (
            <EmptyState icon={UserCog} title="No hay instructores todavía" description="Agrega el primero con el formulario de arriba." />
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 text-sm">
              {filteredInstructors.map((i) => (
                <li key={i.id} className="px-4 py-2.5">
                  {editingInstructorId === i.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={instructorEdit.firstName}
                        onChange={(e) => setInstructorEdit((s) => ({ ...s, firstName: e.target.value }))}
                        className={editInputClass}
                      />
                      <input
                        value={instructorEdit.lastName}
                        onChange={(e) => setInstructorEdit((s) => ({ ...s, lastName: e.target.value }))}
                        className={editInputClass}
                      />
                      <input
                        value={instructorEdit.email}
                        onChange={(e) => setInstructorEdit((s) => ({ ...s, email: e.target.value }))}
                        className={editInputClass}
                      />
                      <button onClick={() => saveInstructor(i.id)} className="text-xs font-medium text-blue-700 hover:underline">
                        Guardar
                      </button>
                      <button onClick={() => setEditingInstructorId(null)} className="text-xs text-gray-500 hover:underline">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span
                          className={cx(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            i.active === false ? "bg-gray-100 text-gray-400" : "bg-blue-50 text-blue-700",
                          )}
                        >
                          {initials(i.firstName, i.lastName)}
                        </span>
                        <span className={cx("break-words", i.active === false && "text-gray-400 line-through")}>
                          {i.firstName} {i.lastName} — {i.email}
                        </span>
                        {i.active === false && <Badge tone="gray">Inactivo</Badge>}
                        {showBranchColumn && i.branch && <Badge tone="gray">{i.branch.name}</Badge>}
                      </div>
                      {!isReadOnly && (
                        <div className="flex shrink-0 gap-1">
                          <button onClick={() => startEditInstructor(i)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-blue-700">
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Editar
                          </button>
                          <button onClick={() => toggleInstructorActive(i)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50">
                            <Power className="h-3.5 w-3.5" aria-hidden="true" />
                            {i.active === false ? "Reactivar" : "Desactivar"}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 flex items-center gap-1.5 font-medium text-gray-800">
            <Users className="h-4 w-4 text-blue-600" aria-hidden="true" />
            Alumnos
          </h2>
          <SearchInput value={studentQuery} onChange={setStudentQuery} placeholder="Buscar alumno..." />

          {filteredStudents.length === 0 ? (
            <EmptyState icon={Users} title="No hay alumnos todavía" />
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-100 text-sm">
              {filteredStudents.map((s) => (
                <li key={s.id} className="px-4 py-2.5">
                  {editingStudentId === s.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={studentEdit.firstName}
                        onChange={(e) => setStudentEdit((v) => ({ ...v, firstName: e.target.value }))}
                        className={editInputClass}
                      />
                      <input
                        value={studentEdit.lastName}
                        onChange={(e) => setStudentEdit((v) => ({ ...v, lastName: e.target.value }))}
                        className={editInputClass}
                      />
                      <input
                        value={studentEdit.email}
                        onChange={(e) => setStudentEdit((v) => ({ ...v, email: e.target.value }))}
                        className={editInputClass}
                      />
                      <input
                        value={studentEdit.phone}
                        onChange={(e) => setStudentEdit((v) => ({ ...v, phone: e.target.value }))}
                        placeholder="Teléfono"
                        className={editInputClass}
                      />
                      <button onClick={() => saveStudent(s.id)} className="text-xs font-medium text-blue-700 hover:underline">
                        Guardar
                      </button>
                      <button onClick={() => setEditingStudentId(null)} className="text-xs text-gray-500 hover:underline">
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-700">
                          {initials(s.firstName, s.lastName)}
                        </span>
                        <span className="break-words">
                          {s.firstName} {s.lastName} — {s.email}
                        </span>
                        {showBranchColumn && s.branch && <Badge tone="gray">{s.branch.name}</Badge>}
                      </div>
                      {!isReadOnly && (
                        <div className="flex shrink-0 gap-1">
                          <button onClick={() => startEditStudent(s)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 hover:text-blue-700">
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Editar
                          </button>
                          <Link href="/enrollments/new" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-blue-700 hover:bg-blue-50">
                            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                            Nueva matrícula
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
