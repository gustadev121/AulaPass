import type { ExternalGroup, ExternalStudent } from "./university-service";

export type AttendanceStatus =
  | "PUNTUAL"
  | "TARDANZA"
  | "FALTA"
  | "AMBIENTE_ESTUDIO";
export type SwipeType = "ENTRADA" | "SALIDA";

export interface AttendanceRuleInput {
  currentTime: Date;
  student: ExternalStudent;
  activeSession: {
    id: string;
    groupId: string;
    expectedStart: Date;
    expectedEnd: Date;
    teacherCheckIn: Date | null;
    status: "ACTIVE" | "CLOSED" | "SUSPENDED";
    toleranceType: "STATIC" | "DYNAMIC";
    toleranceLimit: Date;
  } | null;
  currentCourseGroups: ExternalGroup[]; // Todos los grupos del curso dictado en la sesión
  classroomSchedules: { groupId: string; startTime: Date; endTime: Date }[]; // Horarios del aula del día
}

export interface AttendanceRuleResult {
  valid: boolean;
  swipeType: SwipeType;
  status: AttendanceStatus;
  message: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: agrupamiento de reglas de negocio en clase estática
export class AttendanceRulesEngine {
  /**
   * [RF-07] Calcula el límite de tiempo de tolerancia.
   * PE Válida: Tipo 'STATIC' usa hora programada.
   * PE Válida: Tipo 'DYNAMIC' usa hora de ingreso del docente.
   * AVL: minutos = 0 (límite es igual a la base).
   */
  static calculateToleranceLimit(
    expectedStart: Date,
    teacherCheckIn: Date | null,
    toleranceType: "STATIC" | "DYNAMIC",
    toleranceMinutes: number,
  ): Date {
    const baseTime =
      toleranceType === "DYNAMIC" && teacherCheckIn
        ? new Date(teacherCheckIn)
        : new Date(expectedStart);

    return new Date(baseTime.getTime() + toleranceMinutes * 60000);
  }

  /**
   * [RF-08] Valida si el docente ha excedido el tiempo de espera permitido.
   * PE Válida: Docente ya ingresó (retorna false).
   * PE Válida: Docente no ingresó y tiempo excedido (retorna true).
   * AVL: currentTime exactamente igual al deadline (límite de inasistencia).
   */
  static isTeacherLate(
    expectedStart: Date,
    teacherCheckIn: Date | null,
    currentTime: Date,
    maxTeacherDelayMinutes: number,
  ): boolean {
    if (teacherCheckIn) return false;

    const deadline = new Date(
      expectedStart.getTime() + maxTeacherDelayMinutes * 60000,
    );
    return currentTime.getTime() > deadline.getTime();
  }

  /**
   * Helper para calcular minutos restantes (útil para la API y UI).
   */
  static getMinutesRemaining(deadline: Date, currentTime: Date): number {
    return Math.max(
      0,
      Math.ceil((deadline.getTime() - currentTime.getTime()) / 60000),
    );
  }

  /**
   * Determina el tipo de marcación (ENTRADA o SALIDA) basándose en los registros previos de la sesión.
   * [RF-09] Alternancia de Flujo de Entrada y Salida
   */
  static determineSwipeType(
    hasCheckedIn: boolean | undefined | null,
  ): SwipeType {
    return hasCheckedIn ? "SALIDA" : "ENTRADA";
  }

  /**
   * Evalúa la marcación de un estudiante y calcula su estado (Puntual, Tardanza, Falta, Ambiente de Estudio).
   * Contiene las reglas principales de negocio: RF-04, RF-10, RF-11 y robustez RNF-01.
   */
  static evaluateStudentSwipe(
    input: AttendanceRuleInput,
    hasCheckedIn: boolean,
  ): AttendanceRuleResult {
    // Robustez: Validación de entradas básicas [RNF-01]
    if (
      !input ||
      !input.student ||
      !input.currentTime ||
      !input.currentCourseGroups ||
      !input.classroomSchedules
    ) {
      return {
        valid: false,
        swipeType: "ENTRADA",
        status: "FALTA",
        message: "Error: Datos de entrada inválidos o incompletos.",
      };
    }

    const {
      currentTime,
      student,
      activeSession,
      currentCourseGroups,
      classroomSchedules,
    } = input;

    // 1. Alternancia Entrada / Salida (RF-09)
    const swipeType = AttendanceRulesEngine.determineSwipeType(hasCheckedIn);
    if (swipeType === "SALIDA") {
      return {
        valid: true,
        swipeType: "SALIDA",
        status: "AMBIENTE_ESTUDIO", // El estado final de salida se etiqueta de forma neutral o según corresponda
        message: "Registro de Salida Exitoso.",
      };
    }

    // 2. Si no hay sesión activa en curso
    if (!activeSession) {
      // Verificar si hay alguna clase programada en el aula en este momento para cualquier grupo
      const scheduledNow = classroomSchedules.find(
        (s) => currentTime >= s.startTime && currentTime < s.endTime,
      );

      if (!scheduledNow) {
        // [RF-11] Hora Hueco: No hay clases oficiales programadas
        return {
          valid: true,
          swipeType: "ENTRADA",
          status: "AMBIENTE_ESTUDIO",
          message: "Ingreso registrado como Ambiente de Estudio (Hora Hueco).",
        };
      }

      // Si hay clase programada pero no se ha iniciado la sesión (el docente no ha marcado)
      // Nota: El backend usará esta bandera para disparar la autogeneración de sesión de emergencia [RF-05]
      return {
        valid: true,
        swipeType: "ENTRADA",
        status: "PUNTUAL", // El primer alumno que inicia la sesión de emergencia se considera puntual
        message: "Sesión no iniciada. Requiere autogeneración de emergencia.",
      };
    }

    // 3. Validación de Matrícula y Flexibilidad de Grupo [RF-04]
    // El estudiante debe estar matriculado en alguno de los grupos del curso dictado en la sesión
    const isEnrolledInCourse = student.enrolledGroupIds.some((studentGroupId) =>
      currentCourseGroups.some(
        (courseGroup) => courseGroup.id === studentGroupId,
      ),
    );

    if (!isEnrolledInCourse) {
      return {
        valid: false,
        swipeType: "ENTRADA",
        status: "FALTA",
        message: "Error: Alumno no matriculado en este curso.",
      };
    }

    // 4. Clasificación de Puntualidad [RF-10] y Tolerancia Dinámica/Estática [RF-07]
    // PE Válida: Dentro del límite de tolerancia (PUNTUAL).
    // PE Válida: Posterior al límite de tolerancia (TARDANZA).
    const toleranceLimit = new Date(activeSession.toleranceLimit);

    if (currentTime.getTime() <= toleranceLimit.getTime()) {
      return {
        valid: true,
        swipeType: "ENTRADA",
        status: "PUNTUAL",
        message: "Ingreso Puntual (dentro de tolerancia).",
      };
    } else {
      return {
        valid: true,
        swipeType: "ENTRADA",
        status: "TARDANZA",
        message: "Ingreso con Tardanza (fuera de tolerancia).",
      };
    }
  }

  /**
   * Cierre Automático por Olvido de Marcación de Salida [RF-13]
   * Devuelve las asistencias modificadas agregando la salida forzada a quienes no marcaron.
   */
  static applyAutomaticCheckOuts<
    T extends { checkOut: string | null; checkOutType: string; status: string },
  >(attendances: T[], expectedEndTime: Date): T[] {
    return attendances.map((att) => {
      if (att.checkOut === null) {
        return {
          ...att,
          checkOut: expectedEndTime.toISOString(),
          checkOutType: "FORCED_BY_SESSION_CLOSE",
        };
      }
      return att;
    });
  }

  /**
   * Identifica a los alumnos matriculados que no registraron ninguna marcación.
   * [RF-10] Estos alumnos serán marcados automáticamente como FALTA al cierre de sesión.
   */
  static applyAutomaticAbsences(
    enrolledStudents: ExternalStudent[],
    existingAttendances: { studentCui: string }[],
  ): string[] {
    const presentCuis = new Set(existingAttendances.map((a) => a.studentCui));
    return enrolledStudents
      .filter((s) => !presentCuis.has(s.cui))
      .map((s) => s.cui);
  }
}
