"use server";

import { auth } from "@/auth";
import { grantAdminForUser } from "@/lib/users";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { teams } from "@/lib/db/schema";

const SEED_TEAMS = [
  { name: "Team Aurora", description: "Interface crafts & speculative prototypes.", capacity: 3, sortOrder: 10 },
  { name: "Team Meridian", description: "Research-through-design & storytelling.", capacity: 3, sortOrder: 20 },
  { name: "Team Lumen", description: "Design systems & component quality.", capacity: 3, sortOrder: 30 },
  { name: "Team Drift", description: "Fieldwork, service touchpoints, journey maps.", capacity: 3, sortOrder: 40 },
  { name: "Team Alloy", description: "Cross-device UX, motion, micro-interactions.", capacity: 3, sortOrder: 50 },
  { name: "Team Harbor", description: "Calm tech, ethics, and inclusive flows.", capacity: 3, sortOrder: 60 },
];

export async function seedTeamsAction(): Promise<
  | { ok: true; inserted: number; skipped: number }
  | { ok: false; error: "unauthorized" }
> {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return { ok: false, error: "unauthorized" };
  }
  const db = getDb();
  let inserted = 0;
  let skipped = 0;
  for (const t of SEED_TEAMS) {
    const existing = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.name, t.name))
      .limit(1);
    if (existing.length) {
      skipped++;
      continue;
    }
    await db.insert(teams).values(t);
    inserted++;
  }
  return { ok: true, inserted, skipped };
}

export async function claimAdminAction(secret: string): Promise<
  | { ok: true }
  | {
      ok: false;
      error: "unauthorized" | "invalid_secret" | "misconfigured";
    }
> {
  const session = await auth();
  const rawId = session?.user?.id;
  const userId =
    typeof rawId === "string" ? Number(rawId) : typeof rawId === "number" ? rawId : NaN;
  if (!Number.isFinite(userId)) {
    return { ok: false, error: "unauthorized" };
  }

  const expected = process.env.ADMIN_EXPORT_SECRET;
  if (!expected?.trim()) {
    return { ok: false, error: "misconfigured" };
  }
  if (secret.trim() !== expected) {
    return { ok: false, error: "invalid_secret" };
  }

  const granted = await grantAdminForUser(userId);
  if (!granted) {
    return { ok: false, error: "unauthorized" };
  }
  return { ok: true };
}
