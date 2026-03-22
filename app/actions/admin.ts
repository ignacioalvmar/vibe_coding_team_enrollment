"use server";

import { auth } from "@/auth";
import { grantAdminForUser } from "@/lib/users";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { COASTAL_SEED_TEAMS } from "@/lib/seed-teams";

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
  for (const t of COASTAL_SEED_TEAMS) {
    const existing = await db
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.sortOrder, t.sortOrder))
      .limit(1);
    if (existing.length) {
      skipped++;
      continue;
    }
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
    inserted++;
  }
  if (inserted > 0) {
    revalidatePath("/enroll");
    revalidatePath("/admin/teams");
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
