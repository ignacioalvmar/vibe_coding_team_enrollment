"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { seedTeamsAction } from "@/app/actions/admin";
import type { TeamAdminRow, TeamUpsertInput } from "@/app/actions/team-config";
import {
  createTeamAction,
  deleteTeamAction,
  moveStudentToTeamAction,
  resetTeamsAndEnrollmentsAction,
  updateTeamAction,
} from "@/app/actions/team-config";

type EnrollmentRow = {
  studentEmail: string;
  teamId: number;
  teamName: string;
};

type Props = {
  initialTeams: TeamAdminRow[];
  initialEnrollments: EnrollmentRow[];
};

function emptyUpsert(partial?: Partial<TeamUpsertInput>): TeamUpsertInput {
  return {
    name: partial?.name ?? "",
    description: partial?.description ?? null,
    region: partial?.region ?? null,
    vibe: partial?.vibe ?? null,
    accent: partial?.accent ?? null,
    imageUrl: partial?.imageUrl ?? null,
    nameOptions: partial?.nameOptions ?? ["", "", ""],
    capacity: partial?.capacity ?? 3,
    sortOrder: partial?.sortOrder ?? 80,
  };
}

function toUpsert(t: TeamAdminRow): TeamUpsertInput {
  const o = t.nameOptions ?? [];
  return {
    name: t.name,
    description: t.description,
    region: t.region,
    vibe: t.vibe,
    accent: t.accent,
    imageUrl: t.imageUrl,
    nameOptions: [o[0] ?? "", o[1] ?? "", o[2] ?? ""],
    capacity: t.capacity,
    sortOrder: t.sortOrder,
  };
}

function TeamForm({
  initial,
  onCancel,
  onSave,
  submitLabel,
}: {
  initial: TeamUpsertInput;
  onCancel: () => void;
  onSave: (input: TeamUpsertInput) => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState<TeamUpsertInput>(initial);

  return (
    <div className="mt-3 grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-4 text-sm">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[var(--muted)]">Display name (must match one option)</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="text-[var(--muted)]">Sort order</span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
            value={form.sortOrder}
            onChange={(e) =>
              setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
            }
          />
        </label>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[var(--muted)]">Region</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
            value={form.region ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, region: e.target.value || null }))
            }
          />
        </label>
        <label className="block">
          <span className="text-[var(--muted)]">Vibe</span>
          <input
            className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
            value={form.vibe ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, vibe: e.target.value || null }))
            }
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[var(--muted)]">Accent (hex)</span>
        <input
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-[var(--ink)]"
          value={form.accent ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, accent: e.target.value || null }))
          }
        />
      </label>
      <label className="block">
        <span className="text-[var(--muted)]">Image URL</span>
        <input
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
          value={form.imageUrl ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, imageUrl: e.target.value || null }))
          }
        />
      </label>
      <p className="text-xs text-[var(--muted)]">Three name options</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <input
            key={i}
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
            value={form.nameOptions[i] ?? ""}
            onChange={(e) =>
              setForm((f) => {
                const next = [...f.nameOptions];
                next[i] = e.target.value;
                return { ...f, nameOptions: next };
              })
            }
            placeholder={`Option ${i + 1}`}
          />
        ))}
      </div>
      <label className="block">
        <span className="text-[var(--muted)]">Description (optional)</span>
        <input
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
          value={form.description ?? ""}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value || null }))
          }
        />
      </label>
      <label className="block">
        <span className="text-[var(--muted)]">Capacity</span>
        <input
          type="number"
          min={1}
          className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
          value={form.capacity}
          onChange={(e) =>
            setForm((f) => ({ ...f, capacity: Number(e.target.value) || 1 }))
          }
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          onClick={() => {
            const opts = form.nameOptions.map((s) => s.trim()).filter(Boolean);
            onSave({ ...form, nameOptions: opts });
          }}
        >
          {submitLabel}
        </button>
        <button
          type="button"
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--ink)]"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function TeamsAdminPanel({
  initialTeams,
  initialEnrollments,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [moveEmail, setMoveEmail] = useState("");
  const [moveTargetId, setMoveTargetId] = useState<number | null>(null);
  const [moveForce, setMoveForce] = useState(false);
  const [resetPhrase, setResetPhrase] = useState("");

  function refresh() {
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-full max-w-4xl flex-col px-6 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--muted)]">
        Instructor
      </p>
      <h1 className="mt-2 font-serif text-3xl font-semibold text-[var(--ink)]">
        Team configuration
      </h1>
      <p className="mt-3 text-pretty text-[var(--muted)]">
        Create and edit teams, move students, or reset all enrollments and team
        rows. Auth accounts are kept.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
        >
          Export & tools
        </Link>
        <Link
          href="/enroll"
          className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)]"
        >
          Back to teams
        </Link>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const res = await seedTeamsAction();
              if (!res.ok) {
                setMessage("Seed failed.");
                return;
              }
              setMessage(
                res.inserted > 0
                  ? `Seeded ${res.inserted} team(s); ${res.skipped} skipped.`
                  : `All ${res.skipped} slots already filled — nothing new.`,
              );
              refresh();
            });
          }}
          className="rounded-xl border border-[var(--border)] px-5 py-3 text-sm font-semibold text-[var(--ink)] hover:bg-[var(--surface)] disabled:opacity-50"
        >
          {pending ? "…" : "Seed default teams"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditingId(null);
          }}
          className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white shadow-md hover:brightness-110"
        >
          New team
        </button>
      </div>

      {message ? (
        <p className="mt-4 text-sm text-[var(--ink)]" role="status">
          {message}
        </p>
      ) : null}

      {creating ? (
        <section className="mt-10">
          <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
            Create team
          </h2>
          <TeamForm
            initial={emptyUpsert({
              sortOrder: initialTeams.length
                ? Math.max(...initialTeams.map((t) => t.sortOrder)) + 10
                : 10,
            })}
            submitLabel="Create"
            onCancel={() => setCreating(false)}
            onSave={(input) => {
              startTransition(async () => {
                const res = await createTeamAction({
                  ...input,
                  nameOptions: input.nameOptions.filter(Boolean),
                });
                if (!res.ok) {
                  setMessage(
                    res.error === "validation"
                      ? "Check fields: name must be one of the three options."
                      : "Unauthorized.",
                  );
                  return;
                }
                setMessage("Team created.");
                setCreating(false);
                refresh();
              });
            }}
          />
        </section>
      ) : null}

      <section className="mt-10 space-y-6">
        <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
          Teams
        </h2>
        <ul className="space-y-4">
          {initialTeams.map((t) => (
            <li
              key={t.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{t.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {t.region ?? "—"} · {t.vibe ?? "—"} · seats{" "}
                    {t.enrolled}/{t.capacity}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--ink)]"
                    onClick={() => {
                      setCreating(false);
                      setEditingId(editingId === t.id ? null : t.id);
                    }}
                  >
                    {editingId === t.id ? "Close" : "Edit"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-400"
                    onClick={() => {
                      if (
                        !confirm(
                          `Delete team "${t.name}" and its enrollments?`,
                        )
                      )
                        return;
                      startTransition(async () => {
                        const res = await deleteTeamAction(t.id);
                        if (!res.ok) {
                          setMessage("Delete failed.");
                          return;
                        }
                        setMessage("Team deleted.");
                        setEditingId(null);
                        refresh();
                      });
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {editingId === t.id ? (
                <TeamForm
                  initial={toUpsert(t)}
                  submitLabel="Save changes"
                  onCancel={() => setEditingId(null)}
                  onSave={(input) => {
                    startTransition(async () => {
                      const res = await updateTeamAction(t.id, {
                        ...input,
                        nameOptions: input.nameOptions.filter(Boolean),
                      });
                      if (!res.ok) {
                        setMessage(
                          res.error === "validation"
                            ? "Validation failed."
                            : "Unauthorized.",
                        );
                        return;
                      }
                      setMessage("Team updated.");
                      setEditingId(null);
                      refresh();
                    });
                  }}
                />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-[var(--border)] pt-10">
        <h2 className="font-serif text-xl font-semibold text-[var(--ink)]">
          Move student
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Moves an enrolled email to another team. Leave capacity enforced unless
          you force.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Student email</span>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
              value={moveEmail}
              onChange={(e) => setMoveEmail(e.target.value)}
            >
              <option value="">Select…</option>
              {initialEnrollments.map((e) => (
                <option key={e.studentEmail} value={e.studentEmail}>
                  {e.studentEmail} ({e.teamName})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--muted)]">Target team</span>
            <select
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--ink)]"
              value={moveTargetId ?? ""}
              onChange={(e) =>
                setMoveTargetId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
            >
              <option value="">Select…</option>
              {initialTeams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.enrolled}/{t.capacity})
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={moveForce}
            onChange={(e) => setMoveForce(e.target.checked)}
          />
          Force move (ignore target capacity)
        </label>
        <button
          type="button"
          disabled={pending || !moveEmail || moveTargetId == null}
          className="mt-4 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          onClick={() => {
            if (moveTargetId == null) return;
            startTransition(async () => {
              const res = await moveStudentToTeamAction(
                moveEmail,
                moveTargetId,
                { force: moveForce },
              );
              if (!res.ok) {
                if (res.error === "full") {
                  setMessage("Target team is full — enable force or pick another team.");
                } else if (res.error === "not_found") {
                  setMessage("Student or team not found.");
                } else {
                  setMessage("Move failed.");
                }
                return;
              }
              setMessage("Student moved.");
              setMoveEmail("");
              setMoveTargetId(null);
              refresh();
            });
          }}
        >
          Move student
        </button>
      </section>

      <section className="mt-12 border-t border-red-200 pt-10 dark:border-red-900/40">
        <h2 className="font-serif text-xl font-semibold text-red-800 dark:text-red-300">
          Danger zone
        </h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Deletes all enrollments and all team rows. Type RESET to confirm. User
          accounts are not removed.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 font-mono text-sm text-[var(--ink)]"
            placeholder="RESET"
            value={resetPhrase}
            onChange={(e) => setResetPhrase(e.target.value)}
          />
          <button
            type="button"
            disabled={pending || resetPhrase.trim() !== "RESET"}
            className="rounded-xl border border-red-400 px-5 py-3 text-sm font-semibold text-red-800 disabled:opacity-50 dark:text-red-300"
            onClick={() => {
              startTransition(async () => {
                const res = await resetTeamsAndEnrollmentsAction(resetPhrase);
                if (!res.ok) {
                  setMessage(
                    res.error === "confirmation"
                      ? "Confirmation must be RESET."
                      : "Unauthorized.",
                  );
                  return;
                }
                setMessage("All enrollments and teams cleared.");
                setResetPhrase("");
                refresh();
              });
            }}
          >
            Delete all enrollments & teams
          </button>
        </div>
      </section>
    </div>
  );
}
