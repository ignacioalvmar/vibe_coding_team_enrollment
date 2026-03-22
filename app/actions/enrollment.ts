"use server";

import { auth } from "@/auth";
import {
  joinOrMoveTeam,
  leaveTeam,
  updateTeamDisplayNameForMember,
} from "@/lib/enrollment";
import { revalidatePath } from "next/cache";

export async function enrollInTeamAction(
  teamId: number,
  chosenName?: string | null,
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false as const, error: "unauthorized" as const };
  const outcome = await joinOrMoveTeam(teamId, email, chosenName);
  if (outcome.ok) revalidatePath("/enroll");
  return outcome;
}

export async function updateTeamDisplayNameAction(
  teamId: number,
  newName: string,
) {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false as const, error: "unauthorized" as const };
  const res = await updateTeamDisplayNameForMember(teamId, email, newName);
  if (res.ok) revalidatePath("/enroll");
  return res;
}

export async function leaveTeamAction() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return { ok: false as const, error: "unauthorized" as const };
  const left = await leaveTeam(email);
  if (left) revalidatePath("/enroll");
  return { ok: true as const, left };
}
