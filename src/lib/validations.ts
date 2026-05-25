import { z } from 'zod';

export const identifierSchema = z
  .string()
  .trim()
  .regex(/^\d{8}$/, 'El identificador debe contener exactamente 8 dígitos numéricos.');