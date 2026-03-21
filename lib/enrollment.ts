import { count, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { enrollments, teams } from "@/lib/db/schema";

export type TeamWithEnrolled = {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  sortOrder: number;
  enrolled: number;
};

export type JoinOutcome =
  | { ok: true; kind: "joined" | "moved" | "unchanged" }
  | { ok: false; error: "full" | "team_not_found" };

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

export async function joinOrMoveTeam(
  teamId: number,
  studentEmail: string,
): Promise<JoinOutcome> {
  const db = getDb();
  const email = normalizeEmail(studentEmail);

  const teamRows = await db
    .select({ id: teams.id })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!teamRows.length) {
    return { ok: false, error: "team_not_found" };
  }

  const inserted = await db.execute<{ id: number }>(sql`
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

  const [current] = await db
    .select({ teamId: enrollments.teamId })
    .from(enrollments)
    .where(eq(enrollments.studentEmail, email))
    .limit(1);
  if (current?.teamId === teamId) {
    return { ok: true, kind: "unchanged" };
  }

  const updated = await db.execute<{ id: number }>(sql`
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
