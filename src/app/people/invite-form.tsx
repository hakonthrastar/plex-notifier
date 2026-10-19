"use client";

import { useActionState } from "react";
import { invitePerson, type ActionState } from "@/app/actions";

const input = "rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900";

export function InviteForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(invitePerson, {});
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <input name="name" placeholder="Name" required defaultValue={state.values?.name} className={input} />
      <input
        name="email"
        type="email"
        placeholder="Email"
        required
        defaultValue={state.values?.email}
        className={`${input} flex-1`}
      />
      <button
        disabled={pending}
        className="rounded-md bg-zinc-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        Invite
      </button>
      {state.ok && <p className="w-full text-sm text-emerald-700 dark:text-emerald-400">{state.ok}</p>}
      {state.error && <p className="w-full text-sm text-red-600 dark:text-red-400">{state.error}</p>}
    </form>
  );
}
