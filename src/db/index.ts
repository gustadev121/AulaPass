import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const postgresURL =
  process.env.DB_URL || "postgres://postgres:postgres@localhost:5432/aulapass";

const sql = postgres(postgresURL, {
  prepare: false,
});

/**
 * Drizzle database instance initialized with the connection pool and schema.
 */
export const db = drizzle(sql, { schema });
