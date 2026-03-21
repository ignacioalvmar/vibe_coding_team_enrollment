import { config } from "dotenv";
import { join } from "node:path";
import { defineConfig } from "drizzle-kit";

config({ path: join(process.cwd(), ".env") });

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
