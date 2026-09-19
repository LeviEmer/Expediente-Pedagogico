const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (res.status === 401 && typeof window !== "undefined") {
      // Token vencido o inválido: limpiar sesión y mandar a login en vez de
      // dejar la pantalla mostrando un error crudo.
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message;
    throw new Error(message ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
};

// ---------- Tipos compartidos con la API ----------

export type Role = "ADMIN" | "SUPERVISOR" | "GENERAL_SUPERVISOR" | "INSTRUCTOR";

export type Branch = { id: string; name: string; active: boolean };

// Todas las cuentas con acceso (login), gestionadas por el ADMIN: admin,
// supervisores, supervisor general e instructores que ya tienen usuario.
// El registro de negocio del instructor (nombre, sucursal) se sigue
// creando/editando aparte, bajo /instructors.
export type AdminUser = {
  id: string;
  email: string;
  role: Role;
  active: boolean;
  branchId: string | null;
  branch?: Branch | null;
  instructor?: { id: string; firstName: string; lastName: string } | null;
};

export type CourseType = { id: string; name: string; active: boolean };

export type Student = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  branchId?: string;
  branch?: Branch;
};

export type Instructor = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active?: boolean;
  branchId?: string;
  branch?: Branch;
};

export type Enrollment = {
  id: string;
  studentId: string;
  courseTypeId: string;
  instructorId: string | null;
  transmission: "ESTANDAR" | "AUTOMATICO";
  startDate: string;
  endDate: string | null;
  status: "ACTIVO" | "FINALIZADO" | "CANCELADO";
  finalReportSentAt?: string | null;
  recorridoExamenes?: boolean;
  localizacionHipotecarioVmtPlazaJardin?: boolean;
  student?: Student;
  courseType?: CourseType;
  instructor?: Instructor | null;
  branchId?: string;
  branch?: Branch;
};

// Resultado mínimo de búsqueda por nombre — no incluye lecciones ni progreso,
// solo lo necesario para que un instructor localice al alumno y decida reclamarlo.
export type EnrollmentSearchResult = {
  id: string;
  status: Enrollment["status"];
  transmission: Enrollment["transmission"];
  student: { firstName: string; lastName: string };
  courseType: { name: string };
  instructor: { id: string; firstName: string; lastName: string } | null;
};

export type LessonCriterion = { id: string; text: string; notApplicableIfAutomatic: boolean; orderIndex: number };
export type LessonRubricLevel = { level: number; description: string };
export type LessonRubricDimension = { id: string; name: string; orderIndex: number; levels: LessonRubricLevel[] };
export type Lesson = {
  id: string;
  code: string;
  name: string;
  orderIndex: number;
  hasRubric: boolean;
  criteria: LessonCriterion[];
  rubricDimensions: LessonRubricDimension[];
};

export type CriterionRating = "NO" | "MEDIO" | "SI" | "NA";

export type EnrollmentLessonProgress = {
  id: string;
  lessonId: string;
  isRepeat: boolean;
  instructorNotes: string | null;
  firstTaughtOn: string | null;
  lastUpdatedOn: string | null;
  completedOn: string | null;
  lesson: Lesson;
  criteriaResults: { criterionId: string; rating: CriterionRating | null; criterion: LessonCriterion }[];
  rubricScores: { dimensionId: string; level: number | null; dimension: LessonRubricDimension }[];
};

export type GeneralEvaluationDimension = { id: string; name: string; orderIndex: number; levels: LessonRubricLevel[] };

export type ClassSessionLessonSnapshot = {
  id: string;
  lessonId: string;
  isRepeat: boolean;
  instructorNotes: string | null;
  criteriaSnapshot: { criterionId: string; text: string; rating: CriterionRating | null }[];
  rubricSnapshot: { dimensionId: string; name: string; level: number | null }[];
  previousRubricSnapshot: { dimensionId: string; name: string; level: number | null }[] | null;
  lesson: Lesson;
};

export type ClassSessionSummary = {
  id: string;
  sessionDate: string;
  status: "ABIERTA" | "CERRADA";
  reportSentAt: string | null;
  instructor: Instructor;
  lessons: ClassSessionLessonSnapshot[];
};
