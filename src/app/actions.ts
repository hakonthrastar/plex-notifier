"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { follows, user } from "@/db/schema";
import { auth, requireUser } from "@/lib/auth";
import { syncShowsFromPlex } from "@/lib/shows";

// Server actions can be called directly over HTTP, so every one checks the session.

export async function toggleFollow(formData: FormData) {
  const me = await requireUser();
  const ratingKey = String(formData.get("ratingKey"));
  const follow = formData.get("follow") === "true";

  if (follow) {
    await db.insert(follows).values({ userId: me.id, showRatingKey: ratingKey }).onConflictDoNothing();
  } else {
    await db.delete(follows).where(and(eq(follows.userId, me.id), eq(follows.showRatingKey, ratingKey)));
  }
  refresh();
}

// `values` echoes the submitted fields back on error, because React resets the form after every action.
export type ActionState = { ok?: string; error?: string; values?: Record<string, string> };

export async function syncShows(): Promise<ActionState> {
  await requireUser();
  try {
    const count = await syncShowsFromPlex();
    refresh();
    return { ok: `Synced ${count} shows from Plex.` };
  } catch (err) {
    return { error: `Couldn't sync from Plex: ${(err as Error).message}` };
  }
}

export async function invitePerson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const values = { name, email };

  if (!name) return { error: "Enter a name.", values };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address.", values };

  const existing = await db.query.user.findFirst({ where: eq(user.email, email) });
  if (existing) return { error: `${email} is already invited.`, values };

  const now = new Date();
  await db.insert(user).values({
    id: crypto.randomUUID(),
    name,
    email,
    emailVerified: false,
    createdAt: now,
    updatedAt: now,
  });
  refresh();
  return { ok: `${name} can now sign in with ${email}.` };
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}
