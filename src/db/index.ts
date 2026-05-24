import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  conn: Database.Database | undefined;
};

if (!globalForDb.conn) {
  globalForDb.conn = new Database("sqlite.db");
}

export const conn = globalForDb.conn;
export const db = drizzle(conn, { schema });
