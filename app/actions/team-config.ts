"use server";

import { auth } from "@/auth";
import { count, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { enrollments, teams } from "@/lib/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.isAdmin) return null;
  return session;
}

export type TeamAdminRow = {
  id: number;
  name: string;
  description: string | null;
  region: string | null;
  vibe: string | null;
  accent: string | null;
  imageUrl: string | null;
  nameOptions: string[];
  capacity: number;
  sortOrder: number;
  enrolled: number;
};

export async function listAllEnrollmentsForAdmin(): Promise<
  { studentEmail: string; teamId: number; teamName: string }[]
> {
  const session = await requireAdmin();
  if (!session) return [];
  const db = getDb();
  return db
    .select({
      studentEmail: enrollments.studentEmail,
      teamId: enrollments.teamId,
      teamName: teams.name,
    })
    .from(enrollments)
    .innerJoin(teams, eq(enrollments.teamId, teams.id))
    .orderBy(teams.sortOrder, teams.id, enrollments.studentEmail);
}

export async function listTeamsForAdmin(): Promise<TeamAdminRow[]> {
  const session = await requireAdmin();
  if (!session) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      description: teams.description,
      region: teams.region,
      vibe: teams.vibe,
      accent: teams.accent,
      imageUrl: teams.imageUrl,
      nameOptions: teams.nameOptions,
      capacity: teams.capacity,
      sortOrder: teams.sortOrder,
      enrolled: count(enrollments.id),
    })
    .from(teams)
    .leftJoin(enrollments, eq(enrollments.teamId, teams.id))
    .groupBy(teams.id)
    .orderBy(teams.sortOrder, teams.id);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    region: r.region,
    vibe: r.vibe,
    accent: r.accent,
    imageUrl: r.imageUrl,
    nameOptions: r.nameOptions ?? [],
    capacity: r.capacity,
    sortOrder: r.sortOrder,
    enrolled: Number(r.enrolled),
  }));
}

export type TeamUpsertInput = {
  name: string;
  description: string | null;
  region: string | null;
  vibe: string | null;
  accent: string | null;
  imageUrl: string | null;
  nameOptions: string[];
  capacity: number;
  sortOrder: number;
};

export async function createTeamAction(
  input: TeamUpsertInput,
): Promise<{ ok: true } | { ok: false; error: "unauthorized" | "validation" }> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!input.name.trim() || input.capacity < 1) {
    return { ok: false, error: "validation" };
  }
  const opts = input.nameOptions.map((s) => s.trim()).filter(Boolean);
  if (opts.length > 0 && !opts.includes(input.name.trim())) {
    return { ok: false, error: "validation" };
  }
  const db = getDb();
  await db.insert(teams).values({
    name: input.name.trim(),
    description: input.description?.trim() || null,
    region: input.region?.trim() || null,
    vibe: input.vibe?.trim() || null,
    accent: input.accent?.trim() || null,
    imageUrl: input.imageUrl?.trim() || null,
    nameOptions: opts.length ? opts : [],
    capacity: input.capacity,
    sortOrder: input.sortOrder,
  });
  revalidatePath("/enroll");
  revalidatePath("/admin/teams");
  return { ok: true };
}

export async function updateTeamAction(
  teamId: number,
  input: TeamUpsertInput,
): Promise<{ ok: true } | { ok: false; error: "unauthorized" | "validation" }> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "unauthorized" };
  if (!input.name.trim() || input.capacity < 1) {
    return { ok: false, error: "validation" };
  }
  const opts = input.nameOptions.map((s) => s.trim()).filter(Boolean);
  if (opts.length > 0 && !opts.includes(input.name.trim())) {
    return { ok: false, error: "validation" };
  }
  const db = getDb();
  await db
    .update(teams)
    .set({
      name: input.name.trim(),
      description: input.description?.trim() || null,
      region: input.region?.trim() || null,
      vibe: input.vibe?.trim() || null,
      accent: input.accent?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      nameOptions: opts.length ? opts : [],
      capacity: input.capacity,
      sortOrder: input.sortOrder,
    })
    .where(eq(teams.id, teamId));
  revalidatePath("/enroll");
  revalidatePath("/admin/teams");
  return { ok: true };
}

export async function deleteTeamAction(
  teamId: number,
): Promise<{ ok: true } | { ok: false; error: "unauthorized" }> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "unauthorized" };
  const db = getDb();
  await db.delete(teams).where(eq(teams.id, teamId));
  revalidatePath("/enroll");
  revalidatePath("/admin/teams");
  return { ok: true };
}

export async function resetTeamsAndEnrollmentsAction(
  confirmation: string,
): Promise<
  | { ok: true }
  | { ok: false; error: "unauthorized" | "confirmation" }
> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "unauthorized" };
  if (confirmation.trim() !== "RESET") {
    return { ok: false, error: "confirmation" };
  }
  const db = getDb();
  await db.delete(enrollments);
  await db.delete(teams);
  revalidatePath("/enroll");
  revalidatePath("/admin/teams");
  return { ok: true };
}

export async function moveStudentToTeamAction(
  studentEmail: string,
  targetTeamId: number,
  options?: { force?: boolean },
): Promise<
  | { ok: true }
  | {
      ok: false;
      error: "unauthorized" | "not_found" | "full" | "invalid_email";
    }
> {
  const session = await requireAdmin();
  if (!session) return { ok: false, error: "unauthorized" };
  const email = studentEmail.trim().toLowerCase();
  if (!email) return { ok: false, error: "invalid_email" };

  const db = getDb();
  const result = await db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT id FROM teams WHERE id = ${targetTeamId} FOR UPDATE`,
    );

    const [target] = await tx
      .select({
        id: teams.id,
        capacity: teams.capacity,
      })
      .from(teams)
      .where(eq(teams.id, targetTeamId))
      .limit(1);
    if (!target) return { ok: false as const, error: "not_found" as const };

    const [enrollment] = await tx
      .select({
        id: enrollments.id,
        teamId: enrollments.teamId,
      })
      .from(enrollments)
      .where(eq(enrollments.studentEmail, email))
      .limit(1);
    if (!enrollment) return { ok: false as const, error: "not_found" as const };

    if (enrollment.teamId === targetTeamId) {
      return { ok: true as const };
    }

    const [cntRow] = await tx
      .select({ c: count() })
      .from(enrollments)
      .where(eq(enrollments.teamId, targetTeamId));
    const onTarget = Number(cntRow?.c ?? 0);
    if (!options?.force && onTarget >= target.capacity) {
      return { ok: false as const, error: "full" as const };
    }

    const takenRows = await tx
      .select({ seatIndex: enrollments.seatIndex })
      .from(enrollments)
      .where(eq(enrollments.teamId, targetTeamId));
    const taken = new Set(takenRows.map((r) => r.seatIndex));
    let freeSeat: number | null = null;
    for (let i = 0; i < target.capacity; i++) {
      if (!taken.has(i)) {
        freeSeat = i;
        break;
      }
    }
    if (freeSeat === null) {
      return { ok: false as const, error: "full" as const };
    }

    await tx
      .update(enrollments)
      .set({ teamId: targetTeamId, seatIndex: freeSeat })
      .where(eq(enrollments.id, enrollment.id));

    return { ok: true as const };
  });

  if (result.ok) {
    revalidatePath("/enroll");
    revalidatePath("/admin/teams");
  }
  return result;
}
