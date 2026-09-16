import { defineConfig } from "drizzle-kit";
export default defineConfig({
  schema: "./src/infrastructure/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://devparth:devparth@localhost:5432/devparth_archive" },
  strict: true,
});
