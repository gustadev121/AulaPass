/**
 * 01 – Login Administrador
 * REQ-01: Autenticación Admin — usuario y contraseña hardcodeados.
 * Feature: Administración de AulaPass → Scenario: Autenticación del Administrador
 *
 * @see REQUIREMENTS.md REQ-01
 * @see TEST_CATALOG.md P_Adm_Login_01, P_Adm_Login_02
 * @see admin.feature lines 3-11
 */
import { describe, expect, it } from "vitest";
import { validateAdminCredentials } from "@/lib/auth/admin-auth";

describe("01 — Login Administrador (REQ-01)", () => {
  /**
   * P_Adm_Login_01 — Clase de Equivalencia: Credenciales Válidas
   * Gherkin:
   *   Given que el administrador está en la página de login
   *   When  ingresa el usuario "admin" y la contraseña "admin"
   *   Then  el sistema debe mostrar el resultado "Ingreso exitoso"
   */
  it('[P_Adm_Login_01] credenciales válidas ("admin"/"admin") → ingreso exitoso', () => {
    // Arrange
    const usuario = "admin";
    const password = "admin";

    // Act
    const resultado = validateAdminCredentials(usuario, password);

    // Assert
    expect(resultado).toBe(true);
  });

  /**
   * P_Adm_Login_02 — Clase de Equivalencia: Credenciales Inválidas
   * Gherkin:
   *   Given que el administrador está en la página de login
   *   When  ingresa el usuario "admin" y la contraseña "1234"
   *   Then  el sistema debe mostrar el resultado "Acceso denegado"
   */
  it('[P_Adm_Login_02] credenciales inválidas ("admin"/"1234") → acceso denegado', () => {
    // Arrange
    const usuario = "admin";
    const password = "1234";

    // Act
    const resultado = validateAdminCredentials(usuario, password);

    // Assert
    expect(resultado).toBe(false);
  });
});
