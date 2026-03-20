import { listEnrollmentsForExport } from "@/lib/enrollment";
import { NextResponse } from "next/server";

function escapeCsvField(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const secret = process.env.ADMIN_EXPORT_SECRET;
  const authz = request.headers.get("authorization");
  const token = authz?.startsWith("Bearer ") ? authz.slice(7) : null;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
