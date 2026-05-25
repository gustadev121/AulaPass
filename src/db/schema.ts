import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull(),
  date: text("date").notNull(), // formato: YYYY-MM-DD
  expectedStart: text("expected_start").notNull(), // ISO String
  expectedEnd: text("expected_end").notNull(), // ISO String
  teacherCheckIn: text("teacher_check_in"), // ISO String (nulo si no ha ingresado)
  status: text("status", { enum: ["ACTIVE", "CLOSED", "SUSPENDED"] })
    .notNull()
    .default("ACTIVE"),
  toleranceType: text("tolerance_type", { enum: ["STATIC", "DYNAMIC"] })
    .notNull()
    .default("STATIC"),
  toleranceLimit: text("tolerance_limit"), // ISO String
  virtualCode: text("virtual_code"), // Código para marcación virtual
});

export const attendances = sqliteTable("attendances", {
  id: text("id").primaryKey(),
  studentCui: text("student_cui").notNull(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  checkIn: text("check_in").notNull(), // ISO String
  checkOut: text("check_out"), // ISO String (nulo si sigue en el aula)
  status: text("status", {
    enum: ["PUNTUAL", "TARDANZA", "FALTA", "AMBIENTE_ESTUDIO"],
  }).notNull(),
  checkOutType: text("check_out_type", {
    enum: ["NORMAL", "FORCED_BY_SESSION_CLOSE"],
  })
    .notNull()
    .default("NORMAL"),
  observation: text("observation"), // Justificación u observación (p.ej. "Clase Suspendida / Inasistencia Docente")
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id),
  actorCode: text("actor_cui").notNull(), // Código del docente/admin que realiza la modificación
  studentCui: text("student_cui").notNull(), // CUI del alumno modificado
  originalStatus: text("original_status").notNull(),
  newStatus: text("new_status").notNull(),
  reason: text("reason").notNull(),
  timestamp: text("timestamp").notNull(), // ISO String
});
