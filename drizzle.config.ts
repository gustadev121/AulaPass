import { defineConfig } from "drizzle-kit";

const postgresURL =
  process.env.DB_URL || "postgres://postgres:postgres@localhost:5432/aulapass";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: postgresURL,
  },
});
