export interface ExternalStudent {
  cui: string; // CUI de 8 dígitos
  name: string;
  enrolledGroupIds: string[]; // IDs de grupos en los que está matriculado
}

export interface ExternalTeacher {
  code: string; // DNI o Código del docente
  name: string;
}

export interface ExternalSchedule {
  dayOfWeek: number; // 1 (Lunes) a 6 (Sábado)
  startTime: string; // Formato "HH:MM" (p.ej. "07:00")
  endTime: string; // Formato "HH:MM" (p.ej. "08:40")
}

export interface ExternalGroup {
  id: string; // Identificador del grupo, p.ej. "SW-II-A"
  courseId: string;
  courseName: string;
  teacherCode: string;
  schedules: ExternalSchedule[];
}

// Datos semilla de pruebas (mock de la base de datos de la UNSA)
const MOCK_STUDENTS: ExternalStudent[] = [
  { cui: "20201234", name: "Juan Pérez Quispe", enrolledGroupIds: ["SW-II-A"] },
  {
    cui: "20205678",
    name: "María Flores Flores",
    enrolledGroupIds: ["SW-II-B"],
  },
  {
    cui: "20210001",
    name: "Carlos Condori Yana",
    enrolledGroupIds: ["SW-II-A"],
  },
  {
    cui: "20210999",
    name: "Lucía Mamani Choque",
    enrolledGroupIds: ["DB-I-B"],
  },
  {
    cui: "20210002",
    name: "Ana Choque Mamani",
    enrolledGroupIds: ["SW-II-A", "DB-I-B"],
  }, // Ejemplo matriculada en varios cursos
];

const MOCK_TEACHERS: ExternalTeacher[] = [
  { code: "10101010", name: "Dr. Alberto Cáceres" },
  { code: "20202020", name: "Mg. Beatriz Llerena" },
];

const MOCK_GROUPS: ExternalGroup[] = [
  {
    id: "SW-II-A",
    courseId: "INF-301",
    courseName: "Ingeniería de Software II",
    teacherCode: "10101010",
    schedules: [
      { dayOfWeek: 1, startTime: "07:00", endTime: "08:40" }, // Lunes
      { dayOfWeek: 3, startTime: "07:00", endTime: "08:40" }, // Miércoles
    ],
  },
  {
    id: "SW-II-B",
    courseId: "INF-301",
    courseName: "Ingeniería de Software II",
    teacherCode: "10101010",
    schedules: [
      { dayOfWeek: 1, startTime: "08:50", endTime: "11:00" }, // Lunes
      { dayOfWeek: 3, startTime: "08:50", endTime: "11:00" }, // Miércoles
    ],
  },
  {
    id: "DB-I-B",
    courseId: "INF-302",
    courseName: "Base de Datos I",
    teacherCode: "20202020",
    schedules: [
      { dayOfWeek: 2, startTime: "14:00", endTime: "15:40" }, // Martes
      { dayOfWeek: 4, startTime: "14:00", endTime: "15:40" }, // Jueves
    ],
  },
];

// Capa de Servicio Mockeada (Simula API Universitaria)
// biome-ignore lint/complexity/noStaticOnlyClass: agrupamiento de servicios externos mockeados
export class UniversityService {
  /**
   * Obtiene un alumno por su CUI
   */
  static async getStudentByCui(cui: string): Promise<ExternalStudent | null> {
    const student = MOCK_STUDENTS.find((s) => s.cui === cui.trim());
    return student ? { ...student } : null;
  }

  /**
   * Obtiene un profesor por su CUI/DNI
   */
  static async getTeacherByCode(code: string): Promise<ExternalTeacher | null> {
    const teacher = MOCK_TEACHERS.find((t) => t.code === code.trim());
    return teacher ? { ...teacher } : null;
  }

  /**
   * Obtiene la información de un grupo específico por su ID
   */
  static async getGroupById(groupId: string): Promise<ExternalGroup | null> {
    const group = MOCK_GROUPS.find((g) => g.id === groupId);
    return group ? { ...group } : null;
  }

  /**
   * Obtiene todos los grupos que tiene asignados un docente
   */
  static async getGroupsByTeacher(
    teacherCode: string,
  ): Promise<ExternalGroup[]> {
    return MOCK_GROUPS.filter((g) => g.teacherCode === teacherCode).map(
      (g) => ({
        ...g,
      }),
    );
  }

  /**
   * Obtiene la programación horaria programada para el aula física.
   * Devuelve todos los grupos que tienen sesiones asignadas en el salón, junto con su horario.
   */
  static async getClassroomSchedule(): Promise<
    { group: ExternalGroup; schedule: ExternalSchedule }[]
  > {
    const results: { group: ExternalGroup; schedule: ExternalSchedule }[] = [];
    for (const group of MOCK_GROUPS) {
      for (const schedule of group.schedules) {
        results.push({
          group: { ...group },
          schedule: { ...schedule },
        });
      }
    }
    return results;
  }
}
