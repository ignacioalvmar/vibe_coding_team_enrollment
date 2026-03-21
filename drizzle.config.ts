import { config } from "dotenv";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

config({ path: join(process.cwd(), ".env") });

/** Supabase Transaction pooler (6543) can make drizzle-kit introspection omit CHECK definitions → crash. Use Session pooler (5432) for migrations. See drizzle-orm#3766. */
const drizzleUrl =
  process.env.DRIZZLE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!drizzleUrl) {
  throw new Error("Set DATABASE_URL or DRIZZLE_DATABASE_URL in .env");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: drizzleUrl,
  },
});
