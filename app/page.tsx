import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmailSignInForm } from "@/app/email-sign-in-form";

const cards: { title: string; body: ReactNode }[] = [
  {
    title: "Who can join",
    body: "Anyone in the course with a THI email address (@thi.de). No password — we only check the address format.",
  },
  {
    title: "What you pick",
    body: "One of three seats per team. Join an open slot or move to another team while space is available.",
  },
  {
    title: "For instructors",
    body: (
      <>
        Export rosters anytime from the{" "}
        <Link
          href="/admin"
          className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
        >
          admin export page
        </Link>
        .
      </>
    ),
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user?.email) redirect("/enroll");

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-72 w-72 rounded-full bg-[var(--glow)] blur-3xl" />
        <div className="absolute -right-24 bottom-10 h-80 w-80 rounded-full bg-[var(--glow-2)] blur-3xl" />
      </div>

      <section className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-6 py-16 sm:py-24">
        <p className="text-sm font-medium uppercase tracking-[0.25em] text-[var(--muted)]">
          UXD · Vibe coding
        </p>
        <h1 className="mt-5 max-w-2xl font-serif text-4xl font-semibold leading-tight text-[var(--ink)] sm:text-5xl">
          Enroll in your project team for the semester studio.
        </h1>
        <p className="mt-6 max-w-xl text-pretty text-lg text-[var(--muted)]">
          Enter your THI email to continue. Teams have three seats each; when
          yours is full, it is ready for the instructor roster export.
        </p>

        <div className="mt-10 flex flex-col gap-4">
          <EmailSignInForm />
        </div>

        <div className="mt-16 grid gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-5 shadow-sm backdrop-blur"
            >
              <h2 className="font-serif text-lg font-semibold text-[var(--ink)]">
                {card.title}
              </h2>
              <div className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                {card.body}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
