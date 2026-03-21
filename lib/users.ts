import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { normalizeThiEmail } from "@/lib/thi-email";
import { hashPassword, verifyPassword } from "@/lib/password";

export type PublicUser = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
};

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export async function getUserByEmail(
  rawEmail: string,
): Promise<typeof users.$inferSelect | null> {
  const email = normalizeEmail(rawEmail);
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return rows[0] ?? null;
}

export async function getUserById(
  id: number,
): Promise<typeof users.$inferSelect | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function createUser(input: {
  emailRaw: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<
  | { ok: true; userId: number }
  | { ok: false; error: "invalid_email" | "invalid_name" | "email_taken" }
> {
  const email = normalizeThiEmail(input.emailRaw);
  if (!email) return { ok: false, error: "invalid_email" };

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName) {
    return { ok: false, error: "invalid_name" };
  }

  const db = getDb();
  const passwordHash = hashPassword(input.password);
  try {
    const inserted = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
      })
      .returning({ id: users.id });
    const row = inserted[0];
    if (!row) return { ok: false, error: "email_taken" };
    return { ok: true, userId: row.id };
  } catch {
    return { ok: false, error: "email_taken" };
  }
}

export async function verifyUserCredentials(
  emailRaw: string,
  password: string,
): Promise<PublicUser | null> {
  const email = normalizeThiEmail(emailRaw);
  if (!email) return null;
  const user = await getUserByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
  };
}

export async function updateUserProfile(
  userId: number,
  firstName: string,
  lastName: string,
): Promise<boolean> {
  const fn = firstName.trim();
  const ln = lastName.trim();
  if (!fn || !ln) return false;
  const db = getDb();
  const updated = await db
    .update(users)
    .set({
      firstName: fn,
      lastName: ln,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return updated.length > 0;
}

export async function updateUserPassword(
  userId: number,
  newPasswordPlain: string,
): Promise<boolean> {
  const passwordHash = hashPassword(newPasswordPlain);
  const db = getDb();
  const updated = await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  return updated.length > 0;
}
