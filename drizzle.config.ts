import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    host: "127.0.0.1",
    port: 5432,
    user: "postgres",
    password: "postgres",
    database: "aulapass",
  },
});
