import { auth } from "@/auth";
import { EnrollPanel } from "@/app/enroll/enroll-panel";
import {
  getEnrollmentForStudent,
  listTeamsWithEnrolled,
} from "@/lib/enrollment";
import { getUserByEmail } from "@/lib/users";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EnrollPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/");

  const displayName = session?.user?.name?.trim() || null;
  const isAdmin = Boolean(session?.user?.isAdmin);

  const [teams, current, profile] = await Promise.all([
    listTeamsWithEnrolled(),
    getEnrollmentForStudent(email),
    getUserByEmail(email),
  ]);

  return (
    <EnrollPanel
      teams={teams}
      current={current}
      email={email}
      displayName={displayName}
      firstName={profile?.firstName?.trim() ?? ""}
      lastName={profile?.lastName?.trim() ?? ""}
      isAdmin={isAdmin}
    />
  );
}
