import { z } from "zod";

/**
 * Zod schema for validating course data from CSV.
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
 */
export const StudentCSVSchema = z.object({
  cui: z.string().length(8, "El CUI debe tener exactamente 8 caracteres"),
  name: z.string().min(1, "El nombre no puede estar vacío"),
});

export type CourseCSV = z.infer<typeof CourseCSVSchema>;
export type TeacherCSV = z.infer<typeof TeacherCSVSchema>;
export type StudentCSV = z.infer<typeof StudentCSVSchema>;
