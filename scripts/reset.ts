import { loadEnv } from "./env"; loadEnv();
import postgres from "postgres";
async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_RESET !== "yes") throw new Error("Refusing to reset in production");
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  await sql`DROP SCHEMA public CASCADE`; await sql`CREATE SCHEMA public`; await sql`DROP SCHEMA IF EXISTS drizzle CASCADE`;
  await sql.end(); console.log("✔ database reset — run db:migrate");
}
main().catch((e) => { console.error(e); process.exit(1); });
