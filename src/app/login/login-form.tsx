"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    const email = String(new FormData(e.currentTarget).get("email"));
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/",
      errorCallbackURL: "/login?error=link",
    });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <p className="rounded-md bg-emerald-100 p-3 text-sm text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        If that address has been invited, a sign-in link is on its way. Check your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="you@example.com"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
      />
      <button
        disabled={status === "sending"}
        className="rounded-md bg-zinc-900 px-3 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">Something went wrong. Try again in a minute.</p>
      )}
    </form>
  );
}
