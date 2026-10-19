import Form from "next/form";
import { Suspense } from "react";
import { toggleFollow } from "@/app/actions";
import { AppShell } from "@/app/app-shell";
import { SyncButton } from "@/app/sync-button";
import { requireUser } from "@/lib/auth";
import { lastSyncedAt, listShowsForUser, type ShowRow } from "@/lib/shows";

export default function ShowsPage(props: PageProps<"/">) {
  return (
    <AppShell>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading shows…</p>}>
        <Shows searchParams={props.searchParams} />
      </Suspense>
    </AppShell>
  );
}

async function Shows({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const me = await requireUser();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim() : "";

  const [rows, syncedAt] = await Promise.all([listShowsForUser(me.id, query), lastSyncedAt()]);

  if (!syncedAt) {
    return (
      <section className="flex flex-col items-start gap-3">
        <p>No shows yet. Fetch the show list from the Plex server to get started.</p>
        <SyncButton />
      </section>
    );
  }

  const followed = rows.filter((r) => r.followed);
  const others = rows.filter((r) => !r.followed);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <Form action="/" className="flex flex-1 gap-2">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search shows"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button className="rounded-md border border-zinc-300 px-3 py-2 dark:border-zinc-700">Search</button>
        </Form>
        <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>Synced {syncedAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span>
          <SyncButton />
        </div>
      </section>

      <ShowList title={`Following (${followed.length})`} rows={followed} empty="You're not following any shows yet." />
      <ShowList
        title={query ? `Results for "${query}" (${others.length})` : `All shows (${others.length})`}
        rows={others}
        empty="No shows match."
      />
    </div>
  );
}

function ShowList({ title, rows, empty }: { title: string; rows: ShowRow[]; empty: string }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {rows.map((show) => (
            <li key={show.ratingKey} className="flex items-center justify-between gap-3 px-3 py-2">
              <span>
                {show.title}
                {show.year && <span className="ml-1 text-zinc-500">({show.year})</span>}
              </span>
              <form action={toggleFollow}>
                <input type="hidden" name="ratingKey" value={show.ratingKey} />
                <input type="hidden" name="follow" value={String(!show.followed)} />
                <button
                  className={
                    show.followed
                      ? "rounded-md bg-zinc-900 px-3 py-1 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "rounded-md border border-zinc-300 px-3 py-1 text-sm dark:border-zinc-700"
                  }
                >
                  {show.followed ? "Following" : "Follow"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
