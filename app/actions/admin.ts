"use server";

import { auth } from "@/auth";
import { grantAdminForUser } from "@/lib/users";

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
