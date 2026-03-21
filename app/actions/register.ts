"use server";

import { createUser } from "@/lib/users";

const MIN_PASSWORD = 8;

export async function registerAction(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<
  | { ok: true }
  | {
      ok: false;
      error:
        | "weak_password"
        | "invalid_email"
        | "invalid_name"
        | "email_taken";
    }
> {
  if (input.password.length < MIN_PASSWORD) {
    return { ok: false, error: "weak_password" };
  }

  const result = await createUser({
    emailRaw: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
  });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  return { ok: true };
}
