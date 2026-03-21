"use server";

import { auth } from "@/auth";
import { getUserByEmail, updateUserPassword, updateUserProfile } from "@/lib/users";
import { verifyPassword } from "@/lib/password";
import { revalidatePath } from "next/cache";

const MIN_PASSWORD = 8;

export async function updateProfileAction(firstName: string, lastName: string) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false as const, error: "unauthorized" as const };
  const user = await getUserByEmail(email);
  if (!user) return { ok: false as const, error: "unauthorized" as const };
  const ok = await updateUserProfile(user.id, firstName, lastName);
  if (!ok) return { ok: false as const, error: "invalid" as const };
  revalidatePath("/profile");
  revalidatePath("/enroll");
  const name = `${firstName.trim()} ${lastName.trim()}`.trim();
  return { ok: true as const, name };
}

export async function changePasswordAction(
  currentPassword: string,
  newPassword: string,
) {
  if (newPassword.length < MIN_PASSWORD) {
    return { ok: false as const, error: "weak_password" as const };
  }
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false as const, error: "unauthorized" as const };
  const user = await getUserByEmail(email);
  if (!user) return { ok: false as const, error: "unauthorized" as const };
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    return { ok: false as const, error: "wrong_password" as const };
  }
  await updateUserPassword(user.id, newPassword);
  return { ok: true as const };
}
