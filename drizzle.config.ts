import type { Config } from "drizzle-kit";

// Run `npm run db:push` (after setting DATABASE_URL) to create the tables.
export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies Config;
