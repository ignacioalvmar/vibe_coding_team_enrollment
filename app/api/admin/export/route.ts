import { auth } from "@/auth";
import { listEnrollmentsForExport } from "@/lib/enrollment";
import { getUserById } from "@/lib/users";
import { NextResponse } from "next/server";

function escapeCsvField(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  const session = await auth();
  const rawId = session?.user?.id;
  const userId =
    typeof rawId === "string" ? Number(rawId) : typeof rawId === "number" ? rawId : NaN;
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const dbUser = await getUserById(userId);
  if (!dbUser?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await listEnrollmentsForExport();
  const header = "team_id,team_name,student_email,enrolled_at";
  const lines = rows.map((r) =>
    [
      String(r.teamId),
      escapeCsvField(r.teamName),
      escapeCsvField(r.studentEmail),
      r.enrolledAt ? r.enrolledAt.toISOString() : "",
    ].join(","),
  );
  const csv = [header, ...lines].join("\n");

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="team-enrollments.csv"',
    },
  });
}
