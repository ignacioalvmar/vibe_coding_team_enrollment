import { readFileSync } from "node:fs";
import { join } from "node:path";
import { config, parse } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const envPath = join(process.cwd(), ".env");
let urlFromFile: string | undefined;
try {
  urlFromFile = parse(readFileSync(envPath, "utf8")).DATABASE_URL;
} catch {
  urlFromFile = undefined;
}
const inheritedUrl = process.env.DATABASE_URL;
/** Same rule as drizzle-kit: existing `DATABASE_URL` wins; dotenv does not override by default. */
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

const seedTeams = [
  {
    name: "Team Aurora",
    description: "Interface crafts & speculative prototypes.",
    capacity: 3,
    sortOrder: 10,
  },
  {
    name: "Team Meridian",
    description: "Research-through-design & storytelling.",
    capacity: 3,
    sortOrder: 20,
  },
  {
    name: "Team Lumen",
    description: "Design systems & component quality.",
    capacity: 3,
    sortOrder: 30,
  },
  {
    name: "Team Drift",
    description: "Fieldwork, service touchpoints, journey maps.",
    capacity: 3,
    sortOrder: 40,
  },
  {
    name: "Team Alloy",
    description: "Cross-device UX, motion, micro-interactions.",
    capacity: 3,
    sortOrder: 50,
  },
  {
    name: "Team Harbor",
    description: "Calm tech, ethics, and inclusive flows.",
    capacity: 3,
    sortOrder: 60,
  },
];

async function main() {
  for (const t of seedTeams) {
    const existing = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.name, t.name))
      .limit(1);
    if (existing.length) continue;
    await db.insert(teams).values({
      name: t.name,
      description: t.description,
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
    console.error(err);
    process.exit(1);
  });
