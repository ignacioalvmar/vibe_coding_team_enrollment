import { auth } from "@/auth";
import { Inter, Syne } from "next/font/google";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmailSignInForm } from "@/app/email-sign-in-form";

const inter = Inter({ subsets: ["latin"] });
const syne = Syne({ subsets: ["latin"], weight: ["700", "800"] });

const cards: { title: string; body: ReactNode }[] = [
  {
    title: "Who can join",
    body: "Anyone in the course with a THI email (@thi.de). You sign in with that email and the password you choose.",
  },
  {
    title: "What you pick",
    body: "One of three seats per team. Join an open slot or move to another team while space is available.",
  },
  {
    title: "For instructors",
    body: (
      <>
        Course staff sign in, then open the{" "}
        <Link
          href="/admin"
          className="font-semibold text-slate-900 underline-offset-4 hover:text-cyan-600 hover:underline dark:text-[var(--accent)] dark:hover:text-[var(--accent)]"
        >
          admin page
        </Link>{" "}
        to claim access with the deployment secret and download CSV rosters.
      </>
    ),
  },
];

export default async function Home() {
  const session = await auth();
  if (session?.user?.email) redirect("/enroll");

  return (
    <main
      className={`relative flex min-h-full flex-1 flex-col bg-slate-100 text-slate-900 dark:bg-[var(--background)] dark:text-[var(--ink)] ${inter.className}`}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12 md:px-8">
        <header className="pt-4">
          <h1
            className={`bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-[36px] font-extrabold tracking-tighter text-transparent ${syne.className}`}
          >
            UXD Vibecoding · SS26
          </h1>
          <p className="mt-2 text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-[var(--muted)]">
            Team enrollment portal
          </p>
          <p className="mt-6 max-w-xl text-pretty text-lg text-slate-600 dark:text-[var(--muted)]">
            Create an account with your @thi.de email. Log in to enroll in a team
            for semester assignments and final project. Three seats per team.
          </p>
        </header>

        <div className="mt-10 flex flex-col gap-4">
          <EmailSignInForm />
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-[2.5rem] border border-black/10 bg-white/80 p-6 shadow-sm backdrop-blur-xl dark:border-[var(--border)] dark:bg-[var(--card)]/90"
            >
              <h2
                className={`text-lg font-semibold text-slate-900 dark:text-[var(--ink)] ${syne.className}`}
              >
                {card.title}
              </h2>
              <div className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-[var(--muted)]">
                {card.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
