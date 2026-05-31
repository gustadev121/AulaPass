import { drizzle } from "drizzle-orm/node-postgres";
import postgres from "postgres";
import * as schema from "./schema";

const sql = postgres({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "aulapass",
});

/**
 * Drizzle database instance initialized with the connection pool and schema.
 */
export const db = drizzle(sql, { schema });
