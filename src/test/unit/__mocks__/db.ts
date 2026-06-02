/**
 * Centralized Vitest mock for the Drizzle `db` instance.
 *
 * Usage in a test file:
 *   vi.mock("@/db", () => import("./__mocks__/db"));
 *   import { db } from "./__mocks__/db";
 *
 * Each `vi.fn()` can be overridden per-test with `.mockResolvedValueOnce(...)`.
 */
import { vi } from "vitest";

/**
 * Returns a chainable mock builder that resolves to `value` on `.findFirst()`,
 * `.findMany()`, `.execute()` etc.
 */
function makeQueryMock(defaultValue: unknown = undefined) {
  return vi.fn().mockResolvedValue(defaultValue);
}

/** Spy on db.insert → returns a chainable mock (values → onConflictDoUpdate) */
function makeInsertMock() {
  const mock = {
    values: vi.fn().mockReturnThis(),
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  };
  return vi.fn(() => mock);
}

function makeDeleteMock() {
  const mock = {
    where: vi.fn().mockResolvedValue(undefined),
  };
  return vi.fn(() => mock);
}

export const db = {
  query: {
    courses: {
      findFirst: makeQueryMock(),
      findMany: makeQueryMock([]),
    },
    teachers: {
      findFirst: makeQueryMock(),
      findMany: makeQueryMock([]),
    },
    students: {
      findFirst: makeQueryMock(),
      findMany: makeQueryMock([]),
    },
    attendanceAudit: {
      findFirst: makeQueryMock(),
      findMany: makeQueryMock([]),
    },
    activeCodes: {
      findFirst: makeQueryMock(),
    },
  },
  insert: makeInsertMock(),
  delete: makeDeleteMock(),
};

/**
 * Resets all mocks to their initial (unresolved/unset) state.
 * Call this in `beforeEach` to ensure test isolation.
 */
export function resetDbMocks() {
  // query mocks
  (db.query.courses.findFirst as ReturnType<typeof vi.fn>).mockReset();
  (db.query.courses.findMany as ReturnType<typeof vi.fn>).mockReset();
  (db.query.teachers.findFirst as ReturnType<typeof vi.fn>).mockReset();
  (db.query.teachers.findMany as ReturnType<typeof vi.fn>).mockReset();
  (db.query.students.findFirst as ReturnType<typeof vi.fn>).mockReset();
  (db.query.students.findMany as ReturnType<typeof vi.fn>).mockReset();
  (db.query.attendanceAudit.findFirst as ReturnType<typeof vi.fn>).mockReset();
  (db.query.attendanceAudit.findMany as ReturnType<typeof vi.fn>).mockReset();
  (db.query.activeCodes.findFirst as ReturnType<typeof vi.fn>).mockReset();
  // mutation mocks
  (db.insert as ReturnType<typeof vi.fn>).mockReset();
  (db.insert as ReturnType<typeof vi.fn>).mockImplementation(makeInsertMock());
  (db.delete as ReturnType<typeof vi.fn>).mockReset();
  (db.delete as ReturnType<typeof vi.fn>).mockImplementation(makeDeleteMock());
}
