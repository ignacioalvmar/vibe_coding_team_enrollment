import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "../lib/db/schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const db = drizzle(neon(url), { schema });
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
