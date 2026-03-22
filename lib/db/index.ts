import { drizzle } from "drizzle-orm/postgres-js";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let cached: Database | undefined;

/** Supabase pooler (transaction mode) does not support prepared statements; `prepare: false` matches their Drizzle guidance. */
function createClient(url: string) {
  return postgres(url, {
    prepare: false,
    max: 3,
    connect_timeout: 60,
    connection: {
      /** ms; avoids default server timeouts (e.g. cold Supabase) killing simple joins */
      statement_timeout: 60_000,
    },
  });
}

export function getDb(): Database {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  cached = drizzle(createClient(url), { schema });
  return cached;
}
