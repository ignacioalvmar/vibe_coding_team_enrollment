import { auth } from "@/auth";
import { EnrollPanel } from "@/app/enroll/enroll-panel";
import {
  getEnrollmentForStudent,
  listTeamsWithEnrolled,
} from "@/lib/enrollment";
import { redirect } from "next/navigation";

export default async function EnrollPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) redirect("/");

  const [teams, current] = await Promise.all([
    listTeamsWithEnrolled(),
    getEnrollmentForStudent(email),
  ]);

  return <EnrollPanel teams={teams} current={current} email={email} />;
}
