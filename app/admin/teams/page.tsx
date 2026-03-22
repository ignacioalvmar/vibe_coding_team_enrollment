import { auth } from "@/auth";
import {
  listAllEnrollmentsForAdmin,
  listTeamsForAdmin,
} from "@/app/actions/team-config";
import { TeamsAdminPanel } from "@/app/admin/teams/teams-admin-panel";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  if (!session.user.isAdmin) redirect("/admin");

  const [initialTeams, initialEnrollments] = await Promise.all([
    listTeamsForAdmin(),
    listAllEnrollmentsForAdmin(),
  ]);

  return (
    <TeamsAdminPanel
      initialTeams={initialTeams}
      initialEnrollments={initialEnrollments}
    />
  );
}
