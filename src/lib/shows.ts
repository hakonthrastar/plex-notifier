import "server-only";
import { and, asc, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { follows, shows } from "@/db/schema";
import { connect, listShows, listSharedServers } from "@/lib/plex";

/** Fetches every show from the shared Plex server and upserts it into the cache. */
export async function syncShowsFromPlex() {
  const token = process.env.PLEX_TOKEN;
  if (!token) throw new Error("PLEX_TOKEN is not set");

  const servers = await listSharedServers(token);
  const wanted = process.env.PLEX_SERVER_NAME;
  const match = wanted ? servers.find((s) => s.name === wanted) : servers[0];
  if (!match) throw new Error(wanted ? `No shared server named "${wanted}"` : "No shared Plex servers found");

  const server = await connect(match);
  const fetched = await listShows(server);
  const syncedAt = new Date();

  // Shows removed from Plex are kept, so nobody silently loses a follow.
  await db.transaction(async (tx) => {
    for (const s of fetched) {
      await tx
        .insert(shows)
        .values({ ratingKey: s.ratingKey, title: s.title, year: s.year ?? null, syncedAt })
        .onConflictDoUpdate({
          target: shows.ratingKey,
          set: { title: s.title, year: s.year ?? null, syncedAt },
        });
    }
  });
  return fetched.length;
}

export type ShowRow = { ratingKey: string; title: string; year: number | null; followed: boolean };

/** Shows matching `query`, each marked with whether `userId` follows it. */
export async function listShowsForUser(userId: string, query: string): Promise<ShowRow[]> {
  return db
    .select({
      ratingKey: shows.ratingKey,
      title: shows.title,
      year: shows.year,
      followed: sql<boolean>`${follows.userId} is not null`.mapWith(Boolean),
    })
    .from(shows)
    .leftJoin(follows, and(eq(follows.showRatingKey, shows.ratingKey), eq(follows.userId, userId)))
    .where(query ? like(shows.title, `%${query}%`) : undefined)
    .orderBy(asc(shows.title));
}

export async function lastSyncedAt(): Promise<Date | null> {
  const [row] = await db.select({ at: sql<number | null>`max(${shows.syncedAt})` }).from(shows);
  return row?.at ? new Date(row.at * 1000) : null;
}
