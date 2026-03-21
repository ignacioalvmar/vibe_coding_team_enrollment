"use client";

import { signOut } from "next-auth/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";
import { enrollInTeamAction, leaveTeamAction } from "@/app/actions/enrollment";
import type { TeamWithEnrolled } from "@/lib/enrollment";

type Props = {
  teams: TeamWithEnrolled[];
  current: { teamId: number; teamName: string } | null;
  email: string;
  displayName: string | null;
};

/** Visual themes from the Gemini regional card draft — cycled by team index. */
const CARD_THEMES = [
  {
    vibe: "Retro / chill",
    accent: "#db2777",
    image:
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80&auto=format&fit=crop",
  },
  {
    vibe: "Euro-chic",
    accent: "#2563eb",
    image:
      "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=900&q=80&auto=format&fit=crop",
  },
  {
    vibe: "High energy",
    accent: "#16a34a",
    image:
      "https://images.unsplash.com/photo-1509233725245-74949b81d835?w=900&q=80&auto=format&fit=crop",
  },
  {
    vibe: "Tech-forward",
    accent: "#9333ea",
    image:
      "https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=900&q=80&auto=format&fit=crop",
  },
] as const;

export function EnrollPanel({ teams, current, email, displayName }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onJoin(teamId: number) {
    setNotice(null);
    setError(null);
    startTransition(async () => {
      const res = await enrollInTeamAction(teamId);
      if (!res.ok && res.error === "unauthorized") {
        setError("Session expired. Sign in again.");
        return;
      }
      if (!res.ok) {
        setError(
          res.error === "full" ? "That team is full." : "Team not found.",
        );
        return;
      }
      const msg =
        res.kind === "joined"
          ? "You joined the team."
          : res.kind === "moved"
            ? "Your team was updated."
            : "You are already in this team.";
      setNotice(msg);
      router.refresh();
    });
  }

  function onLeave() {
    setNotice(null);
    setError(null);
    startTransition(async () => {
      const res = await leaveTeamAction();
      if (!res.ok) {
        setError("Session expired. Sign in again.");
        return;
      }
      if (!res.left) {
        setNotice("You were not enrolled in a team.");
        return;
      }
      setNotice("You left your team.");
      router.refresh();
    });
  }

  return (
    <div className="min-h-full bg-[#ececea] text-neutral-900 dark:bg-[var(--background)] dark:text-[var(--ink)]">
      <div className="mx-auto max-w-[1400px] px-5 py-10 sm:px-8 sm:py-12">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-sans text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl dark:text-[var(--ink)]">
              UXD Vibecoding · SS26
            </h1>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-neutral-500 dark:text-[var(--muted)]">
              Team enrollment portal
            </p>
            {displayName ? (
              <p className="mt-4 text-sm font-semibold text-neutral-900 dark:text-[var(--ink)]">
                {displayName}
              </p>
            ) : null}
            <p className="mt-2 max-w-xl break-all font-mono text-xs text-neutral-600 dark:text-[var(--muted)]">
              {email}
            </p>
            {current ? (
              <p className="mt-3 text-sm text-neutral-800 dark:text-[var(--ink)]">
                Current team:{" "}
                <span
                  className="font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  {current.teamName}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-neutral-600 dark:text-[var(--muted)]">
                Pick an open seat on a team below.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--ink)] dark:hover:bg-[var(--surface)]"
            >
              <svg
                className="h-4 w-4 opacity-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Profile
            </Link>
            <Link
              href="/admin"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white"
            >
              <svg
                className="h-4 w-4 opacity-90"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export teams
            </Link>
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--ink)] dark:hover:bg-[var(--surface)]"
            >
              Reset
            </button>
          </div>
        </header>

        {notice ? (
          <p
            className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {teams.length === 0 ? (
          <div
            className="mt-10 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-6 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
            role="status"
          >
            <p className="font-semibold">No teams are set up yet.</p>
            <p className="mt-2 leading-relaxed text-amber-900/90 dark:text-amber-100/90">
              The database has no team rows. After deploying, run{" "}
              <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">
                npm run db:push
              </code>{" "}
              then{" "}
              <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">
                npm run db:seed
              </code>{" "}
              against the same{" "}
              <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs dark:bg-amber-900/50">
                DATABASE_URL
              </code>{" "}
              as Vercel (Project Settings → Environment Variables).
            </p>
          </div>
        ) : null}

        <ul className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-4">
          {teams.map((team, index) => {
            const theme = CARD_THEMES[index % CARD_THEMES.length];
            const full = team.enrolled >= team.capacity;
            const isCurrent = current?.teamId === team.id;
            const regionNo = String(index + 1).padStart(2, "0");

            return (
              <li
                key={team.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]"
              >
                <div className="relative aspect-[5/4] w-full overflow-hidden">
                  <Image
                    src={theme.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/85">
                      Team {regionNo}
                    </p>
                    <p className="mt-1 font-sans text-xl font-bold leading-tight tracking-tight">
                      {team.name}
                    </p>
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: theme.accent }}
                      aria-hidden
                    />
                    <span
                      className="text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-600 dark:text-[var(--muted)]"
                    >
                      {theme.vibe}
                    </span>
                  </div>

                  <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm text-neutral-500 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--muted)]">
                    {team.description ?? "Studio team — three seats."}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-neutral-400 dark:text-[var(--muted)]">
                      Seats ({team.enrolled}/{team.capacity})
                    </p>
                    <div className="flex gap-2">
                      {Array.from({ length: team.capacity }, (_, i) => {
                        const taken = i < team.enrolled;
                        return (
                          <div
                            key={i}
                            className="h-10 flex-1 rounded-lg border text-center text-xs font-medium leading-10 text-neutral-600 dark:border-[var(--border)] dark:text-[var(--muted)]"
                            style={{
                              borderColor: taken ? theme.accent : undefined,
                              backgroundColor: taken
                                ? `${theme.accent}18`
                                : undefined,
                            }}
                          >
                            {taken ? "Taken" : "Open"}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 text-xs font-medium text-neutral-600 dark:text-[var(--muted)]">
                    {full ? (
                      <span className="rounded-full bg-neutral-100 px-2.5 py-1 uppercase tracking-wide text-neutral-700 dark:bg-[var(--surface)] dark:text-[var(--ink)]">
                        Team complete
                      </span>
                    ) : null}
                    {isCurrent ? (
                      <span
                        className="rounded-full px-2.5 py-1 uppercase tracking-wide"
                        style={{
                          backgroundColor: `${theme.accent}22`,
                          color: theme.accent,
                        }}
                      >
                        Your team
                      </span>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    disabled={full || pending}
                    onClick={() => onJoin(team.id)}
                    className="w-full rounded-xl border-2 bg-white py-3 text-sm font-bold uppercase tracking-[0.08em] transition enabled:hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[var(--card)] dark:enabled:hover:bg-[var(--surface)]"
                    style={{
                      borderColor: theme.accent,
                      color: theme.accent,
                    }}
                  >
                    {full
                      ? "Full"
                      : isCurrent
                        ? "Stay here"
                        : current
                          ? "Move here"
                          : "Enroll team"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-14 border-t border-neutral-200 pt-10 dark:border-[var(--border)]">
          <h3 className="font-sans text-lg font-semibold text-neutral-900 dark:text-[var(--ink)]">
            Need to step back?
          </h3>
          <p className="mt-2 max-w-prose text-sm text-neutral-600 dark:text-[var(--muted)]">
            Leave your current team if you want to pick another while seats are
            open.
          </p>
          <button
            type="button"
            disabled={!current || pending}
            onClick={() => onLeave()}
            className="mt-4 rounded-full border border-neutral-300 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--ink)] dark:hover:bg-[var(--surface)]"
          >
            Leave team
          </button>
        </div>
      </div>
    </div>
  );
}
