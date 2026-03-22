import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { enrollments, teams, users } from "@/lib/db/schema";

export type SeatMember = {
  seatIndex: number;
  firstName: string;
  lastName: string;
  studentEmail: string;
};

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
  members: SeatMember[];
};

export type SeatExportRow = {
  teamId: number;
  region: string;
  musicVibe: string;
  teamName: string;
  firstName: string;
  lastName: string;
  studentEmail: string;
  seatNumber: number;
};

export type JoinOutcome =
  | { ok: true; kind: "joined" | "moved" | "unchanged" }
  | {
      ok: false;
      error:
        | "full"
        | "team_not_found"
        | "invalid_name"
        | "name_mismatch"
        | "invalid_seat"
        | "seat_taken";
    };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** SQLSTATE from Postgres driver (may be nested under `cause`). */
function pgErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 8 && cur; i++) {
    if (typeof cur === "object" && cur && "code" in cur) {
      const c = (cur as { code?: unknown }).code;
      if (typeof c === "string") return c;
    }
    cur =
      typeof cur === "object" && cur && "cause" in cur
        ? (cur as { cause: unknown }).cause
        : undefined;
  }
  return undefined;
}

/** SQLSTATE 57014 — statement timeout (e.g. cold DB); one retry after a short backoff */
function postgresErrorCode(err: unknown): string | undefined {
  return pgErrorCode(err);
}

async function withStatementTimeoutRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (postgresErrorCode(err) === "57014") {
      await new Promise((r) => setTimeout(r, 500));
      return await run();
    }
    throw err;
  }
}

export async function listTeamsWithEnrolled(): Promise<TeamWithEnrolled[]> {
  const db = getDb();
  const rows = await withStatementTimeoutRetry(() =>
    db
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
      .orderBy(teams.sortOrder, teams.id),
  );
  const teamRows = rows.map((r) => ({
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

  const memberRows = await withStatementTimeoutRetry(() =>
    db
      .select({
        teamId: enrollments.teamId,
        seatIndex: enrollments.seatIndex,
        firstName: users.firstName,
        lastName: users.lastName,
        studentEmail: enrollments.studentEmail,
      })
      .from(enrollments)
      .leftJoin(users, eq(users.email, enrollments.studentEmail))
      .orderBy(enrollments.teamId, enrollments.seatIndex),
  );

  const membersByTeam = new Map<number, SeatMember[]>();
  for (const m of memberRows) {
    const list = membersByTeam.get(m.teamId) ?? [];
    list.push({
      seatIndex: m.seatIndex,
      firstName: m.firstName?.trim() || "—",
      lastName: m.lastName?.trim() || "—",
      studentEmail: m.studentEmail,
    });
    membersByTeam.set(m.teamId, list);
  }

  return teamRows.map((t) => ({
    ...t,
    members: membersByTeam.get(t.id) ?? [],
  }));
}

export async function getEnrollmentForStudent(
  studentEmail: string,
): Promise<{ teamId: number; teamName: string; seatIndex: number } | null> {
  const db = getDb();
  const email = normalizeEmail(studentEmail);
  const rows = await db
    .select({
      teamId: enrollments.teamId,
      teamName: teams.name,
      seatIndex: enrollments.seatIndex,
    })
    .from(enrollments)
    .innerJoin(teams, eq(enrollments.teamId, teams.id))
    .where(eq(enrollments.studentEmail, email))
    .limit(1);
  const row = rows[0];
  return row
    ? {
        teamId: row.teamId,
        teamName: row.teamName,
        seatIndex: row.seatIndex,
      }
    : null;
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
  seatIndexArg?: number | null,
): Promise<JoinOutcome> {
  const db = getDb();
  const email = normalizeEmail(studentEmail);

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT id FROM teams WHERE id = ${teamId} FOR UPDATE`);

    const [teamRow] = await tx
      .select({ id: teams.id, capacity: teams.capacity })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    if (!teamRow) {
      return { ok: false, error: "team_not_found" };
    }

    const nameRes = await resolveTeamNameForJoin(tx, teamId, chosenName ?? undefined);
    if (!nameRes.ok) {
      return nameRes;
    }

    const [current] = await tx
      .select({
        teamId: enrollments.teamId,
        seatIndex: enrollments.seatIndex,
      })
      .from(enrollments)
      .where(eq(enrollments.studentEmail, email))
      .limit(1);

    let seatIndex: number;
    if (seatIndexArg === undefined || seatIndexArg === null) {
      const seatRows = await tx
        .select({ seatIndex: enrollments.seatIndex })
        .from(enrollments)
        .where(eq(enrollments.teamId, teamId));
      const takenSeats = new Set(seatRows.map((r) => r.seatIndex));
      let first: number | null = null;
      for (let i = 0; i < teamRow.capacity; i++) {
        if (!takenSeats.has(i)) {
          first = i;
          break;
        }
      }
      if (first === null) {
        return { ok: false, error: "full" };
      }
      seatIndex = first;
    } else {
      seatIndex = Math.floor(seatIndexArg);
      if (seatIndex < 0 || seatIndex >= teamRow.capacity) {
        return { ok: false, error: "invalid_seat" };
      }
    }

    const [occupant] = await tx
      .select({ studentEmail: enrollments.studentEmail })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.teamId, teamId),
          eq(enrollments.seatIndex, seatIndex),
        ),
      )
      .limit(1);

    if (occupant && occupant.studentEmail !== email) {
      return { ok: false, error: "seat_taken" };
    }

    if (!current) {
      const [cntRow] = await tx
        .select({ c: count() })
        .from(enrollments)
        .where(eq(enrollments.teamId, teamId));
      const onTeam = Number(cntRow?.c ?? 0);
      if (onTeam >= teamRow.capacity) {
        return { ok: false, error: "full" };
      }
      try {
        await tx.insert(enrollments).values({
          teamId,
          studentEmail: email,
          seatIndex,
        });
      } catch (err) {
        if (pgErrorCode(err) === "23505") {
          return { ok: false, error: "seat_taken" };
        }
        throw err;
      }
      return { ok: true, kind: "joined" };
    }

    if (current.teamId === teamId) {
      if (current.seatIndex === seatIndex) {
        return { ok: true, kind: "unchanged" };
      }
      try {
        await tx
          .update(enrollments)
          .set({ seatIndex })
          .where(eq(enrollments.studentEmail, email));
      } catch (err) {
        if (pgErrorCode(err) === "23505") {
          return { ok: false, error: "seat_taken" };
        }
        throw err;
      }
      return { ok: true, kind: "moved" };
    }

    const [cntRow] = await tx
      .select({ c: count() })
      .from(enrollments)
      .where(eq(enrollments.teamId, teamId));
    const onTarget = Number(cntRow?.c ?? 0);
    if (onTarget >= teamRow.capacity) {
      return { ok: false, error: "full" };
    }

    try {
      await tx
        .update(enrollments)
        .set({ teamId, seatIndex })
        .where(eq(enrollments.studentEmail, email));
    } catch (err) {
      if (pgErrorCode(err) === "23505") {
        return { ok: false, error: "seat_taken" };
      }
      throw err;
    }

    return { ok: true, kind: "moved" };
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

/** One row per seat: filled from enrollments + users, or `open` for empty seats. */
export async function listSeatRowsForExport(): Promise<SeatExportRow[]> {
  const db = getDb();
  const teamRows = await withStatementTimeoutRetry(() =>
    db
      .select({
        id: teams.id,
        name: teams.name,
        region: teams.region,
        vibe: teams.vibe,
        capacity: teams.capacity,
      })
      .from(teams)
      .orderBy(teams.sortOrder, teams.id),
  );

  const memberRows = await withStatementTimeoutRetry(() =>
    db
      .select({
        teamId: enrollments.teamId,
        seatIndex: enrollments.seatIndex,
        firstName: users.firstName,
        lastName: users.lastName,
        studentEmail: enrollments.studentEmail,
      })
      .from(enrollments)
      .leftJoin(users, eq(users.email, enrollments.studentEmail))
      .orderBy(enrollments.teamId, enrollments.seatIndex),
  );

  const byTeamSeat = new Map<
    number,
    Map<number, { firstName: string; lastName: string; studentEmail: string }>
  >();
  for (const m of memberRows) {
    const inner = byTeamSeat.get(m.teamId) ?? new Map();
    inner.set(m.seatIndex, {
      firstName: m.firstName?.trim() ?? "",
      lastName: m.lastName?.trim() ?? "",
      studentEmail: m.studentEmail,
    });
    byTeamSeat.set(m.teamId, inner);
  }

  const out: SeatExportRow[] = [];
  for (const t of teamRows) {
    const seats = byTeamSeat.get(t.id);
    for (let i = 0; i < t.capacity; i++) {
      const occ = seats?.get(i);
      const base = {
        teamId: t.id,
        region: t.region ?? "",
        musicVibe: t.vibe ?? "",
        teamName: t.name,
        seatNumber: i + 1,
      };
      if (occ) {
        out.push({
          ...base,
          firstName: occ.firstName,
          lastName: occ.lastName,
          studentEmail: occ.studentEmail,
        });
      } else {
        out.push({
          ...base,
          firstName: "open",
          lastName: "open",
          studentEmail: "open",
        });
      }
    }
  }
  return out;
}
