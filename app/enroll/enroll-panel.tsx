"use client";

import { signOut } from "next-auth/react";
import { Inter, Syne } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  enrollInTeamAction,
  leaveTeamAction,
  updateTeamDisplayNameAction,
} from "@/app/actions/enrollment";
import type { TeamWithEnrolled } from "@/lib/enrollment";

const inter = Inter({ subsets: ["latin"] });
const syne = Syne({ subsets: ["latin"], weight: ["700", "800"] });

const CARD_EASE = "cubic-bezier(0.175, 0.885, 0.32, 1.275)";

type Props = {
  teams: TeamWithEnrolled[];
  current: { teamId: number; teamName: string; seatIndex: number } | null;
  email: string;
  displayName: string | null;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
};

function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

function fallbackImage(index: number) {
  const gradients = [
    "from-fuchsia-900/90 to-slate-950",
    "from-sky-900/90 to-slate-950",
    "from-emerald-900/90 to-slate-950",
    "from-violet-900/90 to-slate-950",
  ];
  return gradients[index % gradients.length];
}

export function EnrollPanel({
  teams,
  current,
  email,
  displayName,
  firstName,
  lastName,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exportDownloadState, setExportDownloadState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [selectedName, setSelectedName] = useState<Record<number, string>>({});

  useEffect(() => {
    setSelectedName((prev) => {
      const next = { ...prev };
      for (const t of teams) {
        if (next[t.id] === undefined) next[t.id] = t.name;
      }
      return next;
    });
  }, [teams]);

  const regionIndex = useMemo(() => {
    const m = new Map<number, number>();
    const sorted = [...teams].sort((a, b) => a.sortOrder - b.sortOrder);
    sorted.forEach((t, i) => m.set(t.id, i + 1));
    return m;
  }, [teams]);

  function joinErrorMessage(
    err:
      | "full"
      | "team_not_found"
      | "invalid_name"
      | "name_mismatch"
      | "invalid_seat"
      | "seat_taken",
  ) {
    if (err === "full") return "That team is full.";
    if (err === "team_not_found") return "Team not found.";
    if (err === "invalid_name") return "Pick a valid team name from the list.";
    if (err === "invalid_seat") return "That seat is not valid for this team.";
    if (err === "seat_taken") return "Someone just took that seat. Pick another.";
    return "That team name is locked. Match the current name or pick another team.";
  }

  async function downloadExport() {
    setExportDownloadState("loading");
    setError(null);
    try {
      const res = await fetch("/api/admin/export", { credentials: "include" });
      if (!res.ok) {
        setExportDownloadState("error");
        setError(
          res.status === 401
            ? "Not signed in."
            : res.status === 403
              ? "You need admin access to export."
              : "Export failed.",
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "team-enrollments.csv";
      a.click();
      URL.revokeObjectURL(url);
      setExportDownloadState("idle");
    } catch {
      setExportDownloadState("error");
      setError("Network error.");
    }
  }

  function resolveChoice(team: TeamWithEnrolled) {
    const opts = team.nameOptions?.length ? team.nameOptions : [team.name];
    const sel = selectedName[team.id] ?? team.name;
    return opts.includes(sel)
      ? sel
      : opts.includes(team.name)
        ? team.name
        : (opts[0] ?? team.name);
  }

  function onJoin(team: TeamWithEnrolled, seatIndex?: number) {
    setNotice(null);
    setError(null);
    const choice = resolveChoice(team);
    startTransition(async () => {
      const res = await enrollInTeamAction(
        team.id,
        choice,
        seatIndex === undefined ? null : seatIndex,
      );
      if (!res.ok && res.error === "unauthorized") {
        setError("Session expired. Sign in again.");
        return;
      }
      if (!res.ok) {
        setError(joinErrorMessage(res.error));
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

  function onUpdateName(team: TeamWithEnrolled) {
    setNotice(null);
    setError(null);
    const choice = resolveChoice(team);
    startTransition(async () => {
      const res = await updateTeamDisplayNameAction(team.id, choice);
      if (!res.ok) {
        if (res.error === "unauthorized") {
          setError("Session expired. Sign in again.");
        } else if (res.error === "not_member") {
          setError("You are not on that team.");
        } else {
          setError("Pick a valid team name from the list.");
        }
        return;
      }
      setNotice("Team name updated.");
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

  const accentFor = (t: TeamWithEnrolled) =>
    t.accent?.trim() || "#64748b";

  const currentTeamMeta = current
    ? teams.find((x) => x.id === current.teamId)
    : undefined;

  return (
    <div
      className={`min-h-full bg-slate-100 text-slate-900 dark:bg-[var(--background)] dark:text-[var(--ink)] ${inter.className}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12 md:px-8">
        <header className="mb-12 flex flex-col items-center justify-between gap-6 pt-4 md:mb-16 md:flex-row md:items-start">
          <div className="text-center md:text-left">
            <h1
              className={`bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-[36px] font-extrabold tracking-tighter text-transparent ${syne.className}`}
            >
              UXD Vibecoding · SS26
            </h1>
            <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-[var(--muted)]">
              Team enrollment portal
            </p>
            {displayName ? (
              <p className="mt-4 text-sm font-semibold text-slate-900 dark:text-[var(--ink)]">
                {displayName}
              </p>
            ) : null}
            <p className="mt-2 max-w-xl break-all font-mono text-xs text-slate-600 dark:text-[var(--muted)]">
              {email}
            </p>
            {current ? (
              <p className="mt-3 text-sm text-slate-800 dark:text-[var(--ink)]">
                Current team:{" "}
                <span
                  className="font-semibold"
                  style={{
                    color: currentTeamMeta ? accentFor(currentTeamMeta) : "#64748b",
                  }}
                >
                  {current.teamName}
                </span>
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-700 dark:text-[var(--muted)]">
                Pick an open seat on a team below.
              </p>
            )}
          </div>

          <div className="flex w-full flex-col items-stretch gap-4 md:items-end">
            <div className="flex flex-wrap justify-center gap-3 md:justify-end">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => void downloadExport()}
                    disabled={exportDownloadState === "loading"}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {exportDownloadState === "loading" ? "Preparing…" : "Export teams"}
                  </button>
                  <Link
                    href="/admin/teams"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--ink)] dark:hover:bg-[var(--surface)]"
                  >
                    Team setup
                  </Link>
                </>
              ) : null}
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--ink)] dark:hover:bg-[var(--surface)]"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => void signOut({ callbackUrl: "/" })}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-500 transition hover:text-red-500 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--muted)]"
              >
                Sign out
              </button>
            </div>
            <div className="flex w-full flex-row flex-wrap items-center gap-4 border-t border-slate-200 pt-6 dark:border-[var(--border)] md:max-w-xl md:justify-end">
              <div className="min-w-0 flex-1 md:flex-none md:text-right">
                <h3
                  className={`text-lg font-semibold text-slate-900 dark:text-[var(--ink)] ${syne.className}`}
                >
                  Need to step back?
                </h3>
                <p className="mt-2 max-w-prose text-sm text-slate-600 dark:text-[var(--muted)]">
                  Leave your current team if you want to pick another while seats are
                  open.
                </p>
              </div>
              <button
                type="button"
                disabled={!current || pending}
                onClick={() => onLeave()}
                className="shrink-0 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--ink)] dark:hover:bg-[var(--surface)]"
              >
                Leave team
              </button>
            </div>
          </div>
        </header>

        {notice ? (
          <p
            className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
            role="status"
          >
            {notice}
          </p>
        ) : null}
        {error ? (
          <p
            className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
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

        <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {teams.map((team, index) => {
            const accent = accentFor(team);
            const full = team.enrolled >= team.capacity;
            const isCurrent = current?.teamId === team.id;
            const blockedForJoin = full && !isCurrent;
            const displayNo = String(
              regionIndex.get(team.id) ?? index + 1,
            ).padStart(2, "0");
            const opts = team.nameOptions?.length
              ? team.nameOptions
              : [team.name];
            const sel = selectedName[team.id] ?? team.name;
            const selectValue = opts.includes(sel)
              ? sel
              : opts.includes(team.name)
                ? team.name
                : (opts[0] ?? team.name);
            const nameDirty = isCurrent && selectValue !== team.name;
            const imageUrl = team.imageUrl?.trim();

            return (
              <li
                key={team.id}
                className={`group flex flex-col overflow-hidden rounded-[2.5rem] border border-black/10 bg-white/80 shadow-sm backdrop-blur-xl transition-all duration-[400ms] dark:border-[var(--border)] dark:bg-[var(--card)]/90 ${
                  blockedForJoin
                    ? "pointer-events-none opacity-60 grayscale-[50%]"
                    : "hover:-translate-y-2 hover:border-black/20 hover:shadow-xl dark:hover:border-[var(--border)]"
                }`}
                style={{
                  transitionTimingFunction: CARD_EASE,
                }}
              >
                <div className="relative h-40 w-full overflow-hidden md:h-44">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt=""
                      fill
                      className="object-cover brightness-90 saturate-110 transition-transform duration-500 ease-out group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    />
                  ) : (
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${fallbackImage(index)}`}
                      aria-hidden
                    />
                  )}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                    aria-hidden
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
                      Region {displayNo}
                    </span>
                    <h2
                      className={`text-3xl font-bold leading-tight text-white ${syne.className}`}
                    >
                      {team.region ?? team.name}
                    </h2>
                  </div>
                </div>

                <div className="flex flex-grow flex-col p-6 pt-4">
                  <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[var(--muted)]">
                        {team.vibe ?? "Studio"}
                      </span>
                    </div>
                    <label className="sr-only" htmlFor={`team-name-${team.id}`}>
                      Sonic identity for {team.region ?? team.name}
                    </label>
                    <select
                      id={`team-name-${team.id}`}
                      disabled={full}
                      value={selectValue}
                      onChange={(e) =>
                        setSelectedName((s) => ({
                          ...s,
                          [team.id]: e.target.value,
                        }))
                      }
                      className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-slate-100 p-4 text-sm text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--ink)]"
                    >
                      {team.nameOptions?.length ? (
                        <option value="" disabled>
                          Select Sonic Identity…
                        </option>
                      ) : null}
                      {opts.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-6 space-y-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-[var(--muted)]">
                      Seats ({team.enrolled}/{team.capacity})
                    </p>
                    <div className="flex gap-2">
                      {Array.from({ length: team.capacity }, (_, i) => {
                        const member = team.members.find((m) => m.seatIndex === i);
                        const isOpen = !member;
                        const isMe =
                          member &&
                          normalizeEmail(member.studentEmail) ===
                            normalizeEmail(email);
                        const showFirst = isMe ? firstName || member.firstName : member?.firstName;
                        const showLast = isMe ? lastName || member.lastName : member?.lastName;
                        const canPickSlot = isOpen && !pending && !blockedForJoin;
                        return (
                          <div key={i} className="min-w-0 flex-1">
                            {isOpen ? (
                              <button
                                type="button"
                                disabled={!canPickSlot}
                                aria-label={`Reserve seat ${i + 1} on ${team.region ?? team.name}`}
                                onClick={() => onJoin(team, i)}
                                className="flex min-h-[3.25rem] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-1 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-[var(--border)] dark:text-[var(--muted)] dark:hover:bg-[var(--surface)]"
                                style={
                                  canPickSlot
                                    ? {
                                        borderColor: accent,
                                        color: accent,
                                      }
                                    : undefined
                                }
                              >
                                Open
                              </button>
                            ) : (
                              <div
                                className="flex min-h-[3.25rem] w-full flex-col items-center justify-center rounded-xl border px-1 py-1 text-center text-[11px] font-medium leading-tight text-slate-800 dark:text-[var(--ink)]"
                                style={{
                                  borderColor: accent,
                                  backgroundColor: `${accent}18`,
                                  boxShadow: isMe ? `0 0 0 2px ${accent}55` : undefined,
                                }}
                              >
                                <span className="line-clamp-2 break-words">
                                  {showFirst}
                                </span>
                                <span className="line-clamp-2 break-words">
                                  {showLast}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {team.description ? (
                    <p className="mb-4 text-sm text-slate-600 dark:text-[var(--muted)]">
                      {team.description}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap gap-2 text-xs font-medium text-slate-600 dark:text-[var(--muted)]">
                    {full ? (
                      <span className="rounded-full bg-slate-200 px-2.5 py-1 uppercase tracking-wide text-slate-600 dark:bg-[var(--surface)] dark:text-[var(--ink)]">
                        Vibe capacity reached
                      </span>
                    ) : null}
                    {isCurrent ? (
                      <span
                        className="rounded-full px-2.5 py-1 uppercase tracking-wide"
                        style={{
                          backgroundColor: `${accent}22`,
                          color: accent,
                        }}
                      >
                        Your team
                      </span>
                    ) : null}
                  </div>

                  {!full && isCurrent && nameDirty ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => onUpdateName(team)}
                      className="mb-3 w-full rounded-2xl border border-slate-300 bg-white py-3 text-xs font-black uppercase tracking-widest text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[var(--border)] dark:bg-[var(--card)] dark:text-[var(--ink)]"
                    >
                      Update team name
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={blockedForJoin || pending}
                    onClick={() => onJoin(team)}
                    className={`w-full py-4 text-xs font-black uppercase tracking-widest transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 ${
                      full
                        ? "mt-8 rounded-2xl bg-slate-200 text-slate-400"
                        : "mt-8 rounded-2xl border bg-transparent shadow-md hover:bg-slate-900 hover:text-white dark:hover:border-slate-900"
                    }`}
                    style={
                      full
                        ? undefined
                        : {
                            borderColor: accent,
                            color: accent,
                          }
                    }
                  >
                    {full
                      ? "Vibe capacity reached"
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
      </div>
    </div>
  );
}
