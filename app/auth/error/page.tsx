import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-6 py-20">
      <h1 className="font-serif text-3xl font-semibold text-[var(--ink)]">
        Sign-in did not complete
      </h1>
      <p className="mt-4 text-pretty text-[var(--muted)]">
        Use a THI address that ends exactly in{" "}
        <span className="font-mono text-[var(--ink)]">@thi.de</span> (for
        example <span className="font-mono">name@thi.de</span>). Addresses like{" "}
        <span className="font-mono">name@notthi.de</span> are not accepted.
      </p>
      {params.error ? (
        <p className="mt-4 font-mono text-xs text-[var(--muted)]">
          Code: {params.error}
        </p>
      ) : null}
      <Link
        href="/"
        className="mt-8 inline-flex w-fit rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110"
      >
        Back to home
      </Link>
    </div>
  );
}
