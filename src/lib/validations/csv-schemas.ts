import * as z from "zod";

/**
 * Zod schema for validating course data from CSV.
 * Validates code length, non-empty abbreviation and name, and group format.
 */
export const CourseCSVSchema = z.object({
  code: z.string().length(7, "El código debe tener exactamente 7 caracteres"),
  abbreviation: z.string().min(1, "La abreviatura no puede estar vacía"),
  name: z.string().min(1, "El nombre no puede estar vacío"),
  groups: z.string().refine((val) => {
    const groups = val.split(",").map((g) => g.trim());
    return (
      groups.length >= 1 &&
      groups.every((g) => g.length === 1 && /^[a-zA-Z]$/.test(g))
    );
  }, "Grupos deben ser letras únicas separadas por comas (ej: A,B)"),
});

/**
 * Zod schema for validating teacher data from CSV.
 * Validates non-empty username, password, and name, and course code length.
 */
export const TeacherCSVSchema = z.object({
  username: z.string().min(1, "El usuario no puede estar vacío"),
  password: z.string().min(1, "La contraseña no puede estar vacía"),
  name: z.string().min(1, "El nombre no puede estar vacío"),
  courseCode: z
    .string()
    .length(7, "El código de curso debe tener 7 caracteres"),
});

/**
 * Zod schema for validating student data from CSV.
 * Validates CUI length and non-empty name.
 */
export const StudentCSVSchema = z.object({
  cui: z.string().length(8, "El CUI debe tener exactamente 8 caracteres"),
  name: z.string().min(1, "El nombre no puede estar vacío"),
});

/**
 * Type definition for course data extracted from CSV.
 */
export type CourseCSV = z.infer<typeof CourseCSVSchema>;

/**
 * Type definition for teacher data extracted from CSV.
 */
export type TeacherCSV = z.infer<typeof TeacherCSVSchema>;

/**
 * Type definition for student data extracted from CSV.
 */
export type StudentCSV = z.infer<typeof StudentCSVSchema>;
