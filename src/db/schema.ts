import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Database table for storing courses.
 */
export const courses = pgTable("courses", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull(),
  groups: text("groups").notNull(),
});

/**
 * Database table for storing teachers and their assigned courses.
 */
export const teachers = pgTable("teachers", {
  username: text("username").primaryKey(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  courseCode: text("course_code").references(() => courses.code, {
    onDelete: "set null",
  }),
});

/**
 * Database table for storing student information.
 */
export const students = pgTable("students", {
  cui: text("cui").primaryKey(),
  name: text("name").notNull(),
});

/**
 * Database table for auditing attendance records.
 */
export const attendanceAudit = pgTable("attendance_audit", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  courseCode: text("course_code"),
  courseName: text("course_name"),
  groupLetter: text("group_letter"),
  studentCui: text("student_cui"),
  studentName: text("student_name"),
});
