import { count, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { enrollments, teams } from "@/lib/db/schema";

export type TeamWithEnrolled = {
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

export type JoinOutcome =
  | { ok: true; kind: "joined" | "moved" | "unchanged" }
  | {
      ok: false;
      error:
        | "full"
        | "team_not_found"
        | "invalid_name"
        | "name_mismatch";
    };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function listTeamsWithEnrolled(): Promise<TeamWithEnrolled[]> {
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

export async function getEnrollmentForStudent(
  studentEmail: string,
): Promise<{ teamId: number; teamName: string } | null> {
  const db = getDb();
  const email = normalizeEmail(studentEmail);
  const rows = await db
    .select({
      teamId: enrollments.teamId,
      teamName: teams.name,
    })
    .from(enrollments)
    .innerJoin(teams, eq(enrollments.teamId, teams.id))
    .where(eq(enrollments.studentEmail, email))
    .limit(1);
  const row = rows[0];
  return row ? { teamId: row.teamId, teamName: row.teamName } : null;
}

async function resolveTeamNameForJoin(
  tx: Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0],
  teamId: number,
  chosenName: string | undefined,
): Promise<
  | { ok: true }
  | { ok: false; error: "invalid_name" | "name_mismatch" }
> {
  const [team] = await tx
    .select({
      name: teams.name,
      nameOptions: teams.nameOptions,
    })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);

  if (!team) return { ok: false, error: "invalid_name" };

  const opts = team.nameOptions ?? [];
  if (opts.length === 0) return { ok: true };

  const [cnt] = await tx
    .select({ c: count() })
    .from(enrollments)
    .where(eq(enrollments.teamId, teamId));
  const enrolled = Number(cnt?.c ?? 0);

  const pick = chosenName?.trim();

  if (enrolled === 0) {
    const finalName =
      pick && opts.includes(pick) ? pick : opts[0] ?? team.name;
    if (pick && !opts.includes(pick)) {
      return { ok: false, error: "invalid_name" };
    }
    if (finalName !== team.name) {
      await tx
        .update(teams)
        .set({ name: finalName })
        .where(eq(teams.id, teamId));
    }
    return { ok: true };
  }

  if (!pick || pick !== team.name) {
    return { ok: false, error: "name_mismatch" };
  }
  return { ok: true };
}

export async function joinOrMoveTeam(
  teamId: number,
  studentEmail: string,
  chosenName?: string | null,
): Promise<JoinOutcome> {
  const db = getDb();
  const email = normalizeEmail(studentEmail);

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM teams WHERE id = ${teamId} FOR UPDATE`);

    const teamRows = await tx
      .select({ id: teams.id })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    if (!teamRows.length) {
      return { ok: false, error: "team_not_found" };
    }

    const nameRes = await resolveTeamNameForJoin(tx, teamId, chosenName ?? undefined);
    if (!nameRes.ok) {
      return nameRes;
    }

    const inserted = await tx.execute<{ id: number }>(sql`
      INSERT INTO enrollments (team_id, student_email)
      SELECT ${teamId}, ${email}
      FROM teams t
      WHERE t.id = ${teamId}
        AND NOT EXISTS (
          SELECT 1 FROM enrollments WHERE student_email = ${email}
        )
        AND (
          SELECT COUNT(*)::int FROM enrollments e WHERE e.team_id = ${teamId}
        ) < t.capacity
      RETURNING id
    `);
    if (inserted.length > 0) {
      return { ok: true, kind: "joined" };
    }

    const [current] = await tx
      .select({ teamId: enrollments.teamId })
      .from(enrollments)
      .where(eq(enrollments.studentEmail, email))
      .limit(1);
    if (current?.teamId === teamId) {
      return { ok: true, kind: "unchanged" };
    }

    const updated = await tx.execute<{ id: number }>(sql`
      UPDATE enrollments e
      SET team_id = ${teamId}
      FROM teams t
      WHERE e.student_email = ${email}
        AND t.id = ${teamId}
        AND e.team_id <> ${teamId}
        AND (
          SELECT COUNT(*)::int FROM enrollments e2 WHERE e2.team_id = ${teamId}
        ) < t.capacity
      RETURNING e.id
    `);
    if (updated.length > 0) {
      return { ok: true, kind: "moved" };
    }

    return { ok: false, error: "full" };
  });
}

/** Current team member may pick another option from name_options (updates teams.name). */
export async function updateTeamDisplayNameForMember(
  teamId: number,
  studentEmail: string,
  newName: string,
): Promise<
  | { ok: true }
  | {
      ok: false;
      error:
        | "unauthorized"
        | "team_not_found"
        | "not_member"
        | "invalid_name";
    }
> {
  const db = getDb();
  const email = normalizeEmail(studentEmail);
  const pick = newName.trim();

  const [row] = await db
    .select({ teamId: enrollments.teamId })
    .from(enrollments)
    .where(eq(enrollments.studentEmail, email))
    .limit(1);
  if (!row || row.teamId !== teamId) {
    return { ok: false, error: "not_member" };
  }

  const [team] = await db
    .select({ nameOptions: teams.nameOptions })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team) return { ok: false, error: "team_not_found" };

  const opts = team.nameOptions ?? [];
  if (!opts.includes(pick)) {
    return { ok: false, error: "invalid_name" };
  }

  await db.update(teams).set({ name: pick }).where(eq(teams.id, teamId));
  return { ok: true };
}

export async function leaveTeam(studentEmail: string): Promise<boolean> {
  const db = getDb();
  const email = normalizeEmail(studentEmail);
  const deleted = await db
    .delete(enrollments)
    .where(eq(enrollments.studentEmail, email))
    .returning({ id: enrollments.id });
  return deleted.length > 0;
}

export async function listEnrollmentsForExport() {
  const db = getDb();
  return db
    .select({
      teamId: teams.id,
      teamName: teams.name,
      studentEmail: enrollments.studentEmail,
      enrolledAt: enrollments.enrolledAt,
    })
    .from(enrollments)
    .innerJoin(teams, eq(enrollments.teamId, teams.id))
    .orderBy(teams.sortOrder, teams.id, enrollments.studentEmail);
}
