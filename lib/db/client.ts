import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

export type Database = PostgresJsDatabase<typeof schema>;

let cached: Database | null | undefined;

// Lazily create the Drizzle client. Returns null when no DATABASE_URL is set
// (demo/local without a DB) so the repository falls back to an in-memory store.
// Never connects at build time.
export function getDb(): Database | null {
  if (cached === undefined) {
    const url = process.env.DATABASE_URL;
    cached = url
      ? drizzle(postgres(url, { prepare: false }), { schema })
      : null;
  }
  return cached;
}
