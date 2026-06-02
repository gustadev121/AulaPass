/**
 * Validates admin credentials against the hardcoded values.
 * REQ-01: Usuario y contraseña hardcodeados. No maneja sesión.
 *
 * @param username - The username entered by the user.
 * @param password - The password entered by the user.
 * @returns `true` if credentials match, `false` otherwise.
 */
export function validateAdminCredentials(
  username: string,
  password: string,
): boolean {
  return username === "admin" && password === "admin";
}
