export interface ActiveCode {
  code: string;
  courseCode: string;
  courseName: string;
  groupLetter: string;
  expiresAt: number; // Epoch timestamp in milliseconds
}

const globalForActiveCodes = global as unknown as {
  activeCodes: Map<string, ActiveCode>;
};

/**
 * Singleton instance of in-memory active codes to prevent resets during Next.js Hot Reloads.
 */
export const activeCodes =
  globalForActiveCodes.activeCodes || new Map<string, ActiveCode>();

if (process.env.NODE_ENV !== "production") {
  globalForActiveCodes.activeCodes = activeCodes;
}
