import { describe, expect, it } from "vitest";
import { identifierSchema } from "./validations";

describe("identifierSchema - Módulo 1: Acceso e Identificación", () => {
  // TC-1.01: Identificador numérico válido exacto (8 dígitos)
  it("debe aceptar un identificador de 8 dígitos exactos (TC-1.01)", () => {
    const result = identifierSchema.safeParse("12345678");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("12345678");
    }
  });

  // TC-1.02: Identificador con espacios en blanco a los extremos
  it("debe aceptar un identificador con espacios en los extremos y recortarlos (TC-1.02)", () => {
    const result = identifierSchema.safeParse("  12345678  ");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("12345678");
    }
  });

  // TC-1.03: Identificador menor al límite (7 dígitos)
  it("debe rechazar un identificador con menos de 8 dígitos (TC-1.03)", () => {
    const result = identifierSchema.safeParse("1234567");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("exactamente 8 dígitos");
    }
  });

  // TC-1.04: Identificador mayor al límite (9 dígitos)
  it("debe rechazar un identificador con más de 8 dígitos (TC-1.04)", () => {
    const result = identifierSchema.safeParse("123456789");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("exactamente 8 dígitos");
    }
  });

  // TC-1.05: Identificador que contiene letras
  it("debe rechazar un identificador que contiene letras (TC-1.05)", () => {
    const result = identifierSchema.safeParse("1234abcd");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("caracteres numéricos");
    }
  });

  // TC-1.06: Identificador con caracteres especiales
  it("debe rechazar un identificador con caracteres especiales (TC-1.06)", () => {
    const result = identifierSchema.safeParse("1234567!");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("caracteres numéricos");
    }
  });

  // TC-1.07: Identificador vacío
  it("debe rechazar un identificador vacío (TC-1.07)", () => {
    const result = identifierSchema.safeParse("");
    expect(result.success).toBe(false);
  });

  // TC-1.08: Identificador con espacios intermedios
  it("debe rechazar un identificador con espacios intermedios (TC-1.08)", () => {
    const result = identifierSchema.safeParse("1234 567");
    expect(result.success).toBe(false);
    if (!result.success) {
      // Como tiene 8 caracteres (contando el espacio), fallará la regex de números
      expect(result.error.issues[0].message).toContain("caracteres numéricos");
    }
  });

  // TC-1.09: Identificador numérico negativo
  it("debe rechazar un identificador negativo (TC-1.09)", () => {
    const result = identifierSchema.safeParse("-1234567");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("caracteres numéricos");
    }
  });

  // TC-1.10: Identificador con ceros a la izquierda
  it("debe aceptar identificadores con ceros a la izquierda (TC-1.10)", () => {
    const result = identifierSchema.safeParse("01234567");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("01234567");
    }
  });
});
