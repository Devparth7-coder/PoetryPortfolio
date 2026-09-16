import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { __pgClient?: ReturnType<typeof postgres> };

function connectionString() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export const pgClient =
  globalForDb.__pgClient ??
  postgres(connectionString(), {
    max: Number(process.env.DB_POOL_MAX ?? 10),
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    onnotice: () => {},
  });
if (process.env.NODE_ENV !== "production") globalForDb.__pgClient = pgClient;

export const db = drizzle(pgClient, { schema });
export type Db = typeof db;
export { schema };
