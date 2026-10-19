import { asc } from "drizzle-orm";
import { Suspense } from "react";
import { AppShell } from "@/app/app-shell";
import { db } from "@/db";
import { user } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { InviteForm } from "./invite-form";

export default function PeoplePage() {
  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-semibold">People</h1>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <People />
      </Suspense>
    </AppShell>
  );
}

async function People() {
  await requireUser();
  const people = await db.select().from(user).orderBy(asc(user.name));

  return (
    <div className="flex flex-col gap-8">
      <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {people.map((p) => (
          <li key={p.id} className="flex justify-between gap-3 px-3 py-2">
            <span>{p.name}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{p.email}</span>
          </li>
        ))}
      </ul>
      <section>
        <h2 className="mb-1 font-semibold">Invite someone</h2>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          They can then sign in with their email and pick their own shows.
        </p>
        <InviteForm />
      </section>
    </div>
  );
}
