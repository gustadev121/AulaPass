import { z } from "zod";

/**
 * Esquema de validación para CUI/DNI (RF-01, RF-03).
 * Debe contener exactamente 8 dígitos numéricos.
 */
export const identifierSchema = z
  .string()
  .trim()
  .length(8, "El identificador debe contener exactamente 8 dígitos.")
  .regex(/^\d+$/, "El identificador solo debe contener caracteres numéricos.");
