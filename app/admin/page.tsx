"use client";

import { useState } from "react";
import Link from "next/link";

export default function AdminExportPage() {
  const [secret, setSecret] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function download() {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/export", {
        headers: { Authorization: `Bearer ${secret}` },
      });
      if (!res.ok) {
        setStatus("error");
        setMessage(
          res.status === 401
            ? "Invalid or missing export secret."
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
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Network error.");
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Instructor
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-[var(--ink)]">
        Export enrollments
      </h1>
      <p className="mt-3 text-pretty text-[var(--muted)]">
        Enter the admin export secret configured in Vercel (same value as{" "}
        <code className="rounded bg-[var(--surface)] px-1.5 py-0.5 text-sm">
          ADMIN_EXPORT_SECRET
        </code>
        ), then download the CSV.
      </p>

      <label className="mt-8 block text-sm font-medium text-[var(--ink)]">
        Export secret
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
          type="button"
          onClick={() => void download()}
          disabled={!secret.trim() || status === "loading"}
          className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "loading" ? "Preparing…" : "Download CSV"}
        </button>
        <Link
          href="/"
          className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
        >
          Back home
        </Link>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
