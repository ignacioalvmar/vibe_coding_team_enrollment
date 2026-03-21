"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  changePasswordAction,
  updateProfileAction,
} from "@/app/actions/profile";

type Props = {
  email: string;
  initialFirstName: string;
  initialLastName: string;
};

export function ProfileForm({
  email,
  initialFirstName,
  initialLastName,
}: Props) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNew, setConfirmNew] = useState("");
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileNotice(null);
    setProfileError(null);
    startTransition(async () => {
      const res = await updateProfileAction(firstName, lastName);
      if (!res.ok) {
        setProfileError(
          res.error === "unauthorized"
            ? "Session expired. Sign in again."
            : "Check your name and try again.",
        );
        return;
      }
      await updateSession({ name: res.name });
      setProfileNotice("Name updated.");
      router.refresh();
    });
  }

  function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwNotice(null);
    setPwError(null);
    if (newPassword !== confirmNew) {
      setPwError("New passwords do not match.");
      return;
    }
    startTransition(async () => {
      const res = await changePasswordAction(currentPassword, newPassword);
      if (!res.ok) {
        if (res.error === "unauthorized") {
          setPwError("Session expired. Sign in again.");
          return;
        }
        if (res.error === "wrong_password") {
          setPwError("Current password is incorrect.");
          return;
        }
        if (res.error === "weak_password") {
          setPwError("Use at least 8 characters for the new password.");
          return;
        }
        setPwError("Could not update password.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNew("");
      setPwNotice("Password updated.");
    });
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--muted)]">
        Account
      </p>
      <h1 className="mt-3 font-serif text-3xl font-semibold text-[var(--ink)]">
        Profile
      </h1>
      <p className="mt-2 text-pretty text-[var(--muted)]">
        Update how your name appears, or change your password. Your email stays{" "}
        <span className="font-mono text-sm text-[var(--ink)]">{email}</span>{" "}
        (sign-in address).
      </p>

      <form
        onSubmit={(e) => void onSaveProfile(e)}
        className="mt-10 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-6 shadow-sm backdrop-blur"
      >
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
          Name
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="pf-first"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
            >
              First name
            </label>
            <input
              id="pf-first"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
              required
            />
          </div>
          <div>
            <label
              htmlFor="pf-last"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
            >
              Last name
            </label>
            <input
              id="pf-last"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
        >
          Save name
        </button>
        {profileNotice ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {profileNotice}
          </p>
        ) : null}
        {profileError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {profileError}
          </p>
        ) : null}
      </form>

      <form
        onSubmit={(e) => void onChangePassword(e)}
        className="mt-8 space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-6 shadow-sm backdrop-blur"
      >
        <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
          Password
        </h2>
        <div>
          <label
            htmlFor="pf-current-pw"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
          >
            Current password
          </label>
          <input
            id="pf-current-pw"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            required
          />
        </div>
        <div>
          <label
            htmlFor="pf-new-pw"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
          >
            New password
          </label>
          <input
            id="pf-new-pw"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            required
            minLength={8}
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label
            htmlFor="pf-confirm-pw"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
          >
            Confirm new password
          </label>
          <input
            id="pf-confirm-pw"
            type="password"
            autoComplete="new-password"
            value={confirmNew}
            onChange={(e) => setConfirmNew(e.target.value)}
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-[var(--ink)] outline-none ring-[var(--accent)] focus:ring-2"
            required
            minLength={8}
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-6 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--card)] disabled:opacity-60"
        >
          Change password
        </button>
        {pwNotice ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300" role="status">
            {pwNotice}
          </p>
        ) : null}
        {pwError ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {pwError}
          </p>
        ) : null}
      </form>

      <p className="mt-10 text-center text-sm text-[var(--muted)]">
        <Link
          href="/enroll"
          className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
        >
          Back to teams
        </Link>
      </p>
    </div>
  );
}
