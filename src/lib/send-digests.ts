// Sends each person one digest of their queued episodes, then marks those deliveries sent.

import { createHash } from "node:crypto";
import { and, eq, inArray, isNull } from "drizzle-orm";
import type { createDb } from "../db/client.ts";
import { deliveries, seenEpisodes, user } from "../db/schema.ts";
import { buildDigest } from "./digest.ts";
import type { EmailMessage } from "./email.ts";
import type { Episode } from "./new-episodes.ts";

type Db = ReturnType<typeof createDb>;
export type SendFn = (to: string, message: EmailMessage, options: { idempotencyKey?: string }) => Promise<void>;

export type SendResult = { sent: number; failed: { email: string; error: string }[] };

export async function sendPendingDigests(db: Db, send: SendFn, appUrl: string): Promise<SendResult> {
  const rows = await db
    .select({ userId: user.id, email: user.email, episodeKey: deliveries.episodeKey, episode: seenEpisodes })
    .from(deliveries)
    .innerJoin(user, eq(user.id, deliveries.userId))
    .innerJoin(seenEpisodes, eq(seenEpisodes.key, deliveries.episodeKey))
    .where(isNull(deliveries.sentAt));

  const byUser = new Map<string, { email: string; keys: string[]; episodes: Episode[] }>();
  for (const r of rows) {
    const entry = byUser.get(r.userId) ?? { email: r.email, keys: [], episodes: [] };
    entry.keys.push(r.episodeKey);
    entry.episodes.push(r.episode);
    byUser.set(r.userId, entry);
  }

  const result: SendResult = { sent: 0, failed: [] };
  for (const [userId, { email, keys, episodes }] of byUser) {
    // Same person + same episodes = same key, so if we crash after Resend accepted the
    // email but before marking it sent, the retry is recognised and not delivered twice.
    const idempotencyKey = `digest/${createHash("sha256").update(`${userId}|${[...keys].sort().join(",")}`).digest("hex")}`;
    try {
      await send(email, buildDigest(episodes, appUrl), { idempotencyKey });
    } catch (err) {
      result.failed.push({ email, error: (err as Error).message });
      continue;
    }
    await db
      .update(deliveries)
      .set({ sentAt: new Date() })
      .where(and(eq(deliveries.userId, userId), inArray(deliveries.episodeKey, keys)));
    result.sent++;
  }
  return result;
}
