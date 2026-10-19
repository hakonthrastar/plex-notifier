// One run of the new-episode check: fetch from Plex, decide what's new, record it,
// and queue deliveries for followers. Sending the emails is a separate step.
// Takes the db as a parameter so both the app and plain-Node scripts can call it.

import type { createDb } from "../db/client.ts";
import { deliveries, follows, seenEpisodes } from "../db/schema.ts";
import { episodeKey, planNotifications, toEpisode } from "./new-episodes.ts";
import { connectToSharedServer, listRecentEpisodes } from "./plex.ts";

type Db = ReturnType<typeof createDb>;

export type CheckResult = { fetched: number; newEpisodes: number; queued: number; firstRun: boolean };

export async function runCheck(db: Db): Promise<CheckResult> {
  const token = process.env.PLEX_TOKEN;
  if (!token) throw new Error("PLEX_TOKEN is not set");

  const server = await connectToSharedServer(token, process.env.PLEX_SERVER_NAME);
  const fetched = (await listRecentEpisodes(server)).map(toEpisode);

  const seenKeys = new Set((await db.select({ key: seenEpisodes.key }).from(seenEpisodes)).map((r) => r.key));
  const followersByShow = new Map<string, string[]>();
  for (const f of await db.select().from(follows)) {
    followersByShow.set(f.showRatingKey, [...(followersByShow.get(f.showRatingKey) ?? []), f.userId]);
  }

  const firstRun = seenKeys.size === 0;
  const plan = planNotifications({ fetched, seenKeys, followersByShow, firstRun });

  const now = new Date();
  await db.transaction(async (tx) => {
    for (const e of plan.toRecord) {
      await tx
        .insert(seenEpisodes)
        .values({ key: episodeKey(e), ...e, seenAt: now })
        .onConflictDoNothing();
    }
    for (const d of plan.deliveries) {
      await tx
        .insert(deliveries)
        .values({ userId: d.userId, episodeKey: episodeKey(d.episode), createdAt: now })
        .onConflictDoNothing();
    }
  });

  return { fetched: fetched.length, newEpisodes: plan.toRecord.length, queued: plan.deliveries.length, firstRun };
}
