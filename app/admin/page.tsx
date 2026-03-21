"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { claimAdminAction, seedTeamsAction } from "@/app/actions/admin";

export default function AdminExportPage() {
  const { data: session, status, update } = useSession();
  const [secret, setSecret] = useState("");
  const [downloadState, setDownloadState] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [claimPending, startClaimTransition] = useTransition();
  const [seedPending, startSeedTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = session?.user?.isAdmin ?? false;

  async function download() {
    setDownloadState("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/export", { credentials: "include" });
      if (!res.ok) {
        setDownloadState("error");
        setMessage(
          res.status === 401
            ? "Not signed in."
            : res.status === 403
              ? "You need admin access to export."
              : "Download failed.",
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
      setDownloadState("idle");
    } catch {
      setDownloadState("error");
      setMessage("Network error.");
    }
  }

  function onClaim(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startClaimTransition(async () => {
      const res = await claimAdminAction(secret);
      if (!res.ok) {
        if (res.error === "misconfigured") {
          setMessage(
            "Admin secret is not configured on the server. Set ADMIN_EXPORT_SECRET in the environment.",
          );
        } else if (res.error === "invalid_secret") {
          setMessage("That secret is not valid.");
        } else {
          setMessage("Could not verify your session. Sign in again.");
        }
        return;
      }
      setSecret("");
      await update();
    });
  }

  if (status === "loading") {
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-16">
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-16">
        <h1 className="font-serif text-2xl font-semibold text-[var(--ink)]">
          Sign in required
        </h1>
        <p className="mt-3 text-pretty text-[var(--muted)]">
          Sign in with your @thi.de account to claim admin access or export
          enrollments.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex w-fit rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
        >
          Back home
        </Link>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
          Instructor
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-[var(--ink)]">
          Export enrollments
        </h1>
        <p className="mt-3 text-pretty text-[var(--muted)]">
          Download the roster as CSV (team, student email, enrolled time).
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void download()}
            disabled={downloadState === "loading"}
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {downloadState === "loading" ? "Preparing…" : "Download CSV"}
          </button>
          <button
            type="button"
            disabled={seedPending}
            onClick={() => {
              setMessage(null);
              startSeedTransition(async () => {
                const res = await seedTeamsAction();
                if (!res.ok) {
                  setMessage("Seed failed: unauthorized.");
                  return;
                }
                setMessage(
                  res.inserted > 0
                    ? `Seeded ${res.inserted} team${res.inserted === 1 ? "" : "s"} (${res.skipped} already existed).`
                    : `All ${res.skipped} teams already exist — nothing to do.`,
                );
              });
            }}
            className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {seedPending ? "Seeding…" : "Seed teams"}
          </button>
          <Link
            href="/enroll"
            className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
          >
            Back to teams
          </Link>
        </div>

        {message ? (
          <p
            className="mt-4 text-sm text-red-600 dark:text-red-400"
            role="alert"
          >
            {message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Instructor
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-[var(--ink)]">
        Claim admin access
      </h1>
      <p className="mt-3 text-pretty text-[var(--muted)]">
        Enter the same value as{" "}
        <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-sm">
          ADMIN_EXPORT_SECRET
        </code>{" "}
        in your deployment environment. After claiming, you can download the
        CSV anytime while signed in.
      </p>

      <form onSubmit={(e) => void onClaim(e)} className="mt-8">
        <label className="block text-sm font-medium text-[var(--ink)]">
          Admin secret
          <input
            type="password"
            autoComplete="off"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-[var(--ink)] shadow-sm outline-none ring-[var(--accent)] transition focus:ring-2"
          />
        </label>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!secret.trim() || claimPending}
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {claimPending ? "Verifying…" : "Claim admin"}
          </button>
          <Link
            href="/enroll"
            className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
          >
            Back to teams
          </Link>
        </div>
      </form>

      {message ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
