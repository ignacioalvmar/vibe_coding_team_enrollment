import { auth } from "@/auth";
import { listSeatRowsForExport } from "@/lib/enrollment";
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

  const rows = await listSeatRowsForExport();
  const header =
    "team_id,region,music_vibe,team_name,first_name,last_name,student_email,seat_number";
  const lines = rows.map((r) =>
    [
      String(r.teamId),
      escapeCsvField(r.region),
      escapeCsvField(r.musicVibe),
      escapeCsvField(r.teamName),
      escapeCsvField(r.firstName),
      escapeCsvField(r.lastName),
      escapeCsvField(r.studentEmail),
      String(r.seatNumber),
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
