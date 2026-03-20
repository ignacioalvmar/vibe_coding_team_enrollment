"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function EmailSignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        redirect: false,
      });
      if (res?.error) {
        setError("Enter a valid THI address ending in @thi.de.");
        return;
      }
      router.push("/enroll");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex w-full max-w-md flex-col gap-3">
      <label className="sr-only" htmlFor="thi-email">
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
        className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-[var(--ink)] shadow-sm outline-none ring-[var(--accent)] transition focus:ring-2"
        required
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl bg-[var(--accent)] px-8 py-4 text-base font-semibold text-white shadow-lg transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Continuing…" : "Continue"}
      </button>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
