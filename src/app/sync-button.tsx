"use client";

import { useActionState } from "react";
import { syncShows, type ActionState } from "@/app/actions";

export function SyncButton() {
  const [state, action, pending] = useActionState<ActionState>(syncShows, {});
  return (
    <form action={action} className="flex items-center gap-2">
      <button
        disabled={pending}
        className="rounded-md border border-zinc-300 px-3 py-1 text-sm disabled:opacity-50 dark:border-zinc-700"
      >
        {pending ? "Syncing…" : "Refresh from Plex"}
      </button>
      {state.error && <span className="text-sm text-red-600 dark:text-red-400">{state.error}</span>}
    </form>
  );
}
