import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    exclude: ["node_modules", "dist", "build", "coverage", ".direnv"],
    projects: [
      {
        test: {
          name: "components",
          globals: true,
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/test/bdd/**/*.test.{ts,tsx}"],
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
      },
      {
        test: {
          name: "blackbox",
          globals: true,
          environment: "node",
          include: ["src/test/unit/**/*.test.ts"],
          alias: {
            "@": path.resolve(__dirname, "./src"),
          },
        },
      },
    ],
  },
});
