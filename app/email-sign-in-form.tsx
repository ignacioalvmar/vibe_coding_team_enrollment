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

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-slate-100 px-5 py-3.5 text-slate-900 shadow-sm outline-none ring-slate-400 transition focus:ring-2 dark:border-[var(--border)] dark:bg-[var(--surface)] dark:text-[var(--ink)] dark:ring-[var(--accent)]";

  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div
        className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm dark:border-[var(--border)] dark:bg-[var(--card)]"
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
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition ${
            mode === "register"
              ? "bg-slate-950 text-white shadow-md shadow-slate-900/20"
              : "text-slate-500 hover:text-slate-900 dark:text-[var(--muted)] dark:hover:text-[var(--ink)]"
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
          className={`flex-1 rounded-full px-4 py-2.5 text-sm font-bold transition ${
            mode === "signin"
              ? "bg-slate-950 text-white shadow-md shadow-slate-900/20"
              : "text-slate-500 hover:text-slate-900 dark:text-[var(--muted)] dark:hover:text-[var(--ink)]"
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
                className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[var(--muted)]"
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
                className={inputClass}
                required
              />
            </div>
            <div>
              <label
                htmlFor="last-name"
                className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[var(--muted)]"
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
                className={inputClass}
                required
              />
            </div>
          </div>
        ) : null}

        <div>
          <label
            htmlFor="thi-email"
            className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[var(--muted)]"
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
            className={inputClass}
            required
          />
        </div>

        <div>
          <label
            htmlFor="account-password"
            className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[var(--muted)]"
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
            className={inputClass}
            required
            minLength={mode === "register" ? 8 : undefined}
          />
        </div>

        {mode === "register" ? (
          <div>
            <label
              htmlFor="confirm-password"
              className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-[var(--muted)]"
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
              className={inputClass}
              required
              minLength={8}
            />
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-slate-950 px-8 py-4 text-base font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-cyan-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-cyan-600"
        >
          {pending
            ? "Working…"
            : mode === "register"
              ? "Create account & continue"
              : "Sign in"}
        </button>
        {error ? (
          <p
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}
      </form>
    </div>
  );
}
