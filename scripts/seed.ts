import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config, parse } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";
import { COASTAL_SEED_TEAMS } from "../lib/seed-teams";

const envPath = join(process.cwd(), ".env");
let urlFromFile: string | undefined;
try {
  urlFromFile = parse(readFileSync(envPath, "utf8")).DATABASE_URL;
} catch {
  urlFromFile = undefined;
}
const inheritedUrl = process.env.DATABASE_URL;
if (
  urlFromFile &&
  inheritedUrl !== undefined &&
  urlFromFile !== inheritedUrl
) {
  console.warn(
    "[seed] DATABASE_URL in the environment differs from `.env`. " +
      "The environment value is used (same as drizzle-kit). Unset DATABASE_URL in the shell/OS, or make both identical.",
  );
}
config({ path: envPath });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

try {
  const { hostname, port } = new URL(url);
  console.log(`[seed] Connecting to ${hostname}:${port || "5432"}`);
} catch {
  // non-standard URL format — skip diagnostic
}

const queryClient = postgres(url, { prepare: false, max: 1 });
const db = drizzle(queryClient, { schema });
const { teams } = schema;

async function main() {
  for (const t of COASTAL_SEED_TEAMS) {
    const existing = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.sortOrder, t.sortOrder))
      .limit(1);
    if (existing.length) continue;
    await db.insert(teams).values({
      name: t.name,
      description: t.description,
      region: t.region,
      vibe: t.vibe,
      accent: t.accent,
      imageUrl: t.imageUrl,
      nameOptions: t.nameOptions,
      capacity: t.capacity,
      sortOrder: t.sortOrder,
    });
  }
  console.log("Seed complete.");
}

main()
  .then(() => queryClient.end({ timeout: 5 }))
  .catch((err) => {
    const wrapped = err as { cause?: { code?: string } };
    const pgCode = wrapped?.cause?.code;
    if (pgCode === "28P01") {
      console.error(
        "\nSupabase rejected the database password (28P01). Reset it under Project Settings → Database, " +
          "then paste the full URI from Connect → Transaction pooler (no space after `=`). " +
          "If DATABASE_URL is set in your OS or terminal, that value wins over `.env`—unset it or keep them identical.",
      );
    }
    if (pgCode === "42P01") {
      console.error(
        '\nTable or schema missing (42P01). Apply the Drizzle schema first: npm run db:push',
      );
    }
    if (pgCode === "42703") {
      console.error(
        "\nColumn missing (42703). Run migrations: npm run db:push",
      );
    }
    console.error(err);
    process.exit(1);
  });
