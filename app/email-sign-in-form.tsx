"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerAction } from "@/app/actions/register";

type Mode = "signin" | "register";

export function EmailSignInForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      setPending(true);
      try {
        const res = await registerAction({
          firstName,
          lastName,
          email: email.trim(),
          password,
        });
        if (!res.ok) {
          if (res.error === "weak_password") {
            setError("Use at least 8 characters for your password.");
            return;
          }
          if (res.error === "invalid_email") {
            setError("Enter a valid THI address ending in @thi.de.");
            return;
          }
          if (res.error === "invalid_name") {
            setError("Enter your first and last name.");
            return;
          }
          if (res.error === "email_taken") {
            setError("That email already has an account. Sign in instead.");
            return;
          }
          setError("Something went wrong. Try again.");
          return;
        }
        const signRes = await signIn("credentials", {
          email: email.trim(),
          password,
          redirect: false,
        });
        if (signRes?.error) {
          setError("Account created but sign-in failed. Try signing in.");
          return;
        }
        router.push("/enroll");
        router.refresh();
      } finally {
        setPending(false);
      }
      return;
    }

    setPending(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push("/enroll");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div
        className="flex rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-sm"
        role="tablist"
        aria-label="Account mode"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "register"}
          onClick={() => {
            setMode("register");
            setError(null);
          }}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            mode === "register"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          Create account
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signin"}
          onClick={() => {
            setMode("signin");
            setError(null);
          }}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            mode === "signin"
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--muted)] hover:text-[var(--ink)]"
          }`}
        >
          Sign in
        </button>
      </div>

      <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
        {mode === "register" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="first-name"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
              >
                First name
              </label>
              <input
                id="first-name"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="Alex"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3.5 text-[var(--ink)] shadow-sm outline-none ring-[var(--accent)] transition focus:ring-2"
                required
              />
            </div>
            <div>
              <label
                htmlFor="last-name"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
              >
                Last name
              </label>
              <input
                id="last-name"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Müller"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3.5 text-[var(--ink)] shadow-sm outline-none ring-[var(--accent)] transition focus:ring-2"
                required
              />
            </div>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="thi-email"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
          >
            THI email
          </label>
          <input
            id="thi-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@thi.de"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3.5 text-[var(--ink)] shadow-sm outline-none ring-[var(--accent)] transition focus:ring-2"
            required
          />
        </div>

        <div>
          <label
            htmlFor="account-password"
            className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
          >
            Password
          </label>
          <input
            id="account-password"
            name="password"
            type="password"
            autoComplete={
              mode === "register" ? "new-password" : "current-password"
            }
            placeholder={mode === "register" ? "At least 8 characters" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3.5 text-[var(--ink)] shadow-sm outline-none ring-[var(--accent)] transition focus:ring-2"
            required
            minLength={mode === "register" ? 8 : undefined}
          />
        </div>

        {mode === "register" ? (
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1 block text-xs font-medium uppercase tracking-wide text-[var(--muted)]"
            >
              Confirm password
            </label>
            <input
              id="confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Repeat password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-3.5 text-[var(--ink)] shadow-sm outline-none ring-[var(--accent)] transition focus:ring-2"
              required
              minLength={8}
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-[var(--accent)] px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending
            ? "Working…"
            : mode === "register"
              ? "Create account & continue"
              : "Sign in"}
        </button>
        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
