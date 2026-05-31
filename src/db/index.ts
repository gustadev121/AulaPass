import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL || `postgres://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || "postgres"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "aulapass"}`;

const client = postgres(connectionString);

/**
 * Drizzle database instance initialized with the connection pool and schema.
 */
export const db = drizzle(client, { schema });
